'use strict';

module.exports = ({ strapi }) => {
  let syncInterval = null;

  // Helper functions that have access to the strapi instance via closure
  const getGridlyRecords = async (gridlyConfig) => {
    try {
      const axios = require('axios');
      const response = await axios.get(`https://api.gridly.com/v1/views/${gridlyConfig['gridly-view-id']}/records`, {
        headers: {
          'Authorization': `ApiKey ${gridlyConfig['gridly-api-key']}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data || [];
    } catch (error) {
      return [];
    }
  };

  const getTranslatableFields = (attributes) => {
    const translatableFields = [];
    
    // Fields that should never be translated (unique identifiers, slugs, etc.)
    const excludedFieldNames = ['slug', 'Slug'];
    
    for (const [fieldName, fieldConfig] of Object.entries(attributes)) {
      // Skip system fields and relations
      if (['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'publishedBy'].includes(fieldName)) {
        continue;
      }
      
      // Skip slug fields by name
      if (excludedFieldNames.includes(fieldName)) {
        continue;
      }
      
      // Skip uid fields (typically slugs/unique identifiers)
      if (fieldConfig.type === 'uid') {
        continue;
      }
      
      // Skip relation fields
      if (fieldConfig.type === 'relation') {
        continue;
      }
      
      // Include text-based fields that are likely translatable
      if (['string', 'text', 'richtext', 'blocks', 'json'].includes(fieldConfig.type)) {
        translatableFields.push(fieldName);
      }
    }
    
    return translatableFields;
  };

  const getFieldType = (fieldConfig) => {
    if (!fieldConfig) return 'text';
    
    switch (fieldConfig.type) {
      case 'richtext':
      case 'blocks':
        return 'richtext';
      case 'json':
        return 'json';
      case 'text':
        return 'text';
      case 'string':
        return 'text';
      default:
        return 'text';
    }
  };

  const extractTextFromRichText = (blocks) => {
    if (!Array.isArray(blocks)) {
      return String(blocks);
    }
    
    return blocks.map(block => {
      if (block.children && Array.isArray(block.children)) {
        return block.children.map(child => child.text || '').join('');
      }
      return block.text || '';
    }).join(' ');
  };

  const processFieldDataForComparison = (fieldValue, fieldType) => {
    if (fieldValue === null || fieldValue === undefined) {
      return '';
    }
    
    switch (fieldType) {
      case 'richtext':
      case 'blocks':
        // For rich text, we need to extract the text content
        if (Array.isArray(fieldValue)) {
          return extractTextFromRichText(fieldValue);
        }
        return String(fieldValue);
      
      case 'json':
        return JSON.stringify(fieldValue);
      
      default:
        return String(fieldValue);
    }
  };

  const hasContentChanged = (strapiItem, gridlyRecord) => {
    // Find the source language cell in Gridly record
    const sourceLanguageCell = gridlyRecord.cells.find(cell => 
      cell.columnId === strapiItem.contentTypeUid.split('::')[1].split('.')[0].toLowerCase() || 
      cell.columnId === 'en' // fallback to 'en'
    );
    
    if (!sourceLanguageCell) {
      return true; // Assume it needs update if we can't find the cell
    }
    
    // Compare the content
    const gridlyValue = sourceLanguageCell.value;
    const strapiValue = processFieldDataForComparison(strapiItem.fieldValue, strapiItem.fieldType);
    
    // Also check if updatedAt has changed
    const updatedAtCell = gridlyRecord.cells.find(cell => cell.columnId === 'strapi_meta_updated_at');
    const gridlyUpdatedAt = updatedAtCell ? updatedAtCell.value : null;
    const strapiUpdatedAt = strapiItem.updatedAt;
    
    const contentChanged = gridlyValue !== strapiValue;
    const timestampChanged = gridlyUpdatedAt !== strapiUpdatedAt;
    
    return contentChanged || timestampChanged;
  };

  const findItemsToSync = (strapiContent, gridlyRecords) => {
    const itemsToSync = [];
    const gridlyRecordsMap = new Map();
    
    // Create a map of Gridly records for quick lookup
    for (const record of gridlyRecords) {
      gridlyRecordsMap.set(record.id, record);
    }
    
    // Check each Strapi content item
    for (const contentItem of strapiContent) {
      const gridlyRecord = gridlyRecordsMap.get(contentItem.id);
      
      if (!gridlyRecord) {
        // Record doesn't exist in Gridly - needs to be created
        itemsToSync.push(contentItem);
        continue;
      }
      
      // Record exists - check if content has changed
      const needsUpdate = hasContentChanged(contentItem, gridlyRecord);
      if (needsUpdate) {
        itemsToSync.push(contentItem);
      }
    }
    
    return itemsToSync;
  };

  const getStrapiContent = async (project) => {
    const content = [];
    
    for (const contentItem of project['selected-content']) {
      try {
        // Validate contentItem structure
        if (!contentItem.contentTypeUid) {
          continue;
        }
        
        if (!contentItem.id && !contentItem.entryId && !contentItem.itemId) {
          continue;
        }
        
        const entryId = contentItem.id || contentItem.entryId || contentItem.itemId;
        
        // Get the entry from Strapi
        const entry = await strapi.entityService.findOne(contentItem.contentTypeUid, entryId, {
          populate: '*'
        });
        
        if (entry) {
          // Process each field that needs translation
          if (contentItem.fields && Array.isArray(contentItem.fields)) {
            // Use predefined fields from contentItem, but exclude slug fields
            for (const field of contentItem.fields) {
              if (!field.name) {
                continue;
              }
              
              // Skip slug fields (by name or type)
              const fieldName = field.name.toLowerCase();
              if (fieldName === 'slug' || field.type === 'uid') {
                continue;
              }
              
              // Also check the actual field type from schema
              const contentType = strapi.contentTypes[contentItem.contentTypeUid];
              if (contentType && contentType.attributes && contentType.attributes[field.name]) {
                const actualFieldType = contentType.attributes[field.name].type;
                if (actualFieldType === 'uid') {
                  continue;
                }
              }
              
              const fieldValue = entry[field.name];
              if (fieldValue !== undefined && fieldValue !== null) {
                content.push({
                  id: `${contentItem.contentTypeUid}_${entryId}_${field.name}`,
                  contentTypeUid: contentItem.contentTypeUid,
                  entryId: entryId,
                  fieldName: field.name,
                  fieldValue: fieldValue,
                  fieldType: field.type || 'text',
                  entryTitle: entry.title || entry.name || `Entry ${entryId}`,
                  updatedAt: entry.updatedAt,
                  createdAt: entry.createdAt
                });
              }
            }
          } else {
            // No fields defined, try to determine them dynamically
            // Get the content type schema to determine translatable fields
            const contentType = strapi.contentTypes[contentItem.contentTypeUid];
            if (contentType && contentType.attributes) {
              const translatableFields = getTranslatableFields(contentType.attributes);
              
              for (const fieldName of translatableFields) {
                const fieldValue = entry[fieldName];
                if (fieldValue !== undefined && fieldValue !== null) {
                  const fieldType = getFieldType(contentType.attributes[fieldName]);
                  content.push({
                    id: `${contentItem.contentTypeUid}_${entryId}_${fieldName}`,
                    contentTypeUid: contentItem.contentTypeUid,
                    entryId: entryId,
                    fieldName: fieldName,
                    fieldValue: fieldValue,
                    fieldType: fieldType,
                    entryTitle: entry.title || entry.name || `Entry ${entryId}`,
                    updatedAt: entry.updatedAt,
                    createdAt: entry.createdAt
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        // Silently continue on errors
      }
    }
    
    return content;
  };

  const syncSpecificItems = async (project, gridlyConfig, itemsToSync) => {
    try {
      // Create a mock ctx object for the controller method
      const mockCtx = {
        params: { projectId: project.id },
        status: 200,
        body: {}
      };
      
      // Get the project controller
      const projectController = strapi.plugin("gridly-integration").controller("project");
      
      // Call the existing syncToGridly method (it will handle the actual syncing)
      await projectController.syncToGridly(mockCtx);
      
      // Check if the sync was successful
      if (mockCtx.status === 200) {
        // Update project with sync information
        await strapi.entityService.update('plugin::gridly-integration.gridly-project', project.id, {
          data: {
            'last-sync': new Date().toISOString(),
            'records-sent': itemsToSync.length
          }
        });
        
        // Emit a custom event that the admin UI can listen to
        if (strapi.eventHub) {
          strapi.eventHub.emit('gridly:background-sync-completed', {
            projectId: project.id,
            recordsSent: itemsToSync.length,
            timestamp: new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      // Silently handle errors
    }
  };

  const syncProjectSilently = async (project, gridlyConfig) => {
    // Skip projects without selected content
    if (!project['selected-content'] || project['selected-content'].length === 0) {
      return;
    }
    
    // Skip projects that were synced very recently (within last 30 seconds)
    const lastSync = project['last-sync'];
    if (lastSync) {
      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
      
      if (timeSinceLastSync < 30000) { // 30 seconds
        return;
      }
    }
    
    try {
      // Get existing records from Gridly
      const gridlyRecords = await getGridlyRecords(gridlyConfig);
      
      // Get current content from Strapi
      const strapiContent = await getStrapiContent(project);
      
      // Compare and find items that need syncing
      const itemsToSync = findItemsToSync(strapiContent, gridlyRecords);
      
      if (itemsToSync.length === 0) {
        return;
      }
      
      // Sync only the items that need updates
      await syncSpecificItems(project, gridlyConfig, itemsToSync);
      
    } catch (error) {
      // Silently handle errors
    }
  };

  const performBackgroundSync = async () => {
    try {
      // Get all projects using entityService directly
      const projects = await strapi.entityService.findMany('plugin::gridly-integration.gridly-project', {
        populate: ['subprojects', 'gridly-config-id']
      });
      
      if (!projects || projects.length === 0) {
        return;
      }
      
      // Get Gridly configuration
      const gridlyConfigs = await strapi.entityService.findMany('plugin::gridly-integration.gridly-config', {
        populate: {
          created_by: {
            fields: ['id', 'firstname', 'lastname', 'username', 'email']
          }
        },
        fields: ['id', 'name', 'gridly-api-key', 'gridly-view-id', 'description', 'is-active', 'created_at', 'updated_at']
      });
      
      if (!gridlyConfigs || gridlyConfigs.length === 0) {
        return;
      }
      
      const gridlyConfig = gridlyConfigs[0];
      
      // Sync each project silently
      for (const project of projects) {
        try {
          await syncProjectSilently(project, gridlyConfig);
        } catch (error) {
          // Silently handle errors
        }
      }
      
    } catch (error) {
      // Silently handle errors
    }
  };

  return {
    /**
     * Initialize the background sync service
     */
    init() {
      console.log('🔄 Initializing background sync service...');
      
      // Start the background sync loop
      this.startBackgroundSync();
    },

    /**
     * Start the background sync loop
     */
    startBackgroundSync() {
      const SYNC_INTERVAL = 60000; // 60 seconds
      
      console.log(`⏰ Starting background sync loop (every ${SYNC_INTERVAL/1000} seconds)`);
      
      // Run initial sync after a short delay
      setTimeout(() => {
        performBackgroundSync();
      }, 2000); // Wait 2 seconds before first sync
      
      // Set up recurring sync
      syncInterval = setInterval(() => {
        performBackgroundSync();
      }, SYNC_INTERVAL);
    },

    /**
     * Stop the background sync service
     */
    stop() {
      console.log('🛑 Stopping background sync service...');
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    }
  };
};