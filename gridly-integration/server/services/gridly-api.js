'use strict';

const axios = require('axios');

module.exports = ({ strapi }) => ({
  /**
   * Send content to Gridly for translation
   */
  async sendContentToGridly(gridlyConfig, selectedContent, sourceLanguage) {
    try {
      console.log('🚀 Starting Gridly API call...');
      console.log('📋 Gridly config:', { 
        hasApiKey: !!gridlyConfig['gridly-api-key'], 
        viewId: gridlyConfig['gridly-view-id'] 
      });
      console.log('📋 Selected content:', selectedContent);
      console.log('🌍 Source language:', sourceLanguage);
      
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('Gridly API key or View ID is missing');
      }

      // Get content entries for the selected content
      console.log('🔄 Preparing Gridly records...');
      const records = await this.prepareGridlyRecords(selectedContent, sourceLanguage);
      //console.log('📋 Prepared records:', records);
      
      // Send to Gridly API in batches (max 1000 records per request)
      console.log('📤 Sending to Gridly API...');
      const batchSize = 1000;
      const batches = [];
      
      for (let i = 0; i < records.length; i += batchSize) {
        batches.push(records.slice(i, i + batchSize));
      }
      
      console.log(`📦 Sending ${batches.length} batch(es) of records...`);
      
      const responses = [];
      for (let i = 0; i < batches.length; i++) {
        console.log(`📤 Sending batch ${i + 1}/${batches.length} with ${batches[i].length} records...`);
        const response = await axios.post(
          `https://api.gridly.com/v1/views/${viewId}/records`,
          batches[i],
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `ApiKey ${apiKey}`
            }
          }
        );
        responses.push(response.data);
      }

      //console.log('✅ Gridly API responses:', responses);

      return {
        success: true,
        data: responses,
        recordsCount: records.length
      };
    } catch (error) {
      console.error('❌ Error sending content to Gridly:', error);
      
      // Extract the actual error message from Gridly API response
      let errorMessage = 'Unknown error occurred';
      let errorDetails = null;
      
      if (error.response?.data) {
        console.error('❌ Gridly API error response:', error.response.data);
        errorDetails = error.response.data;
        
        // Try to extract meaningful error message from Gridly response
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map(err => err.message || err).join(', ');
        } else {
          errorMessage = `Gridly API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('❌ Final error message:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      };
    }
  },

  /**
   * Prepare records for Gridly API with enhanced metadata for bidirectional sync
   */
  async prepareGridlyRecords(selectedContent, sourceLanguage) {
    console.log('🔄 Starting to prepare Gridly records...');
    const records = [];
    
    for (const contentItem of selectedContent) {
      try {
        console.log('📋 Processing content item:', contentItem);
        
        // Get the content entry from Strapi
        const entry = await strapi.entityService.findOne(
          contentItem.contentTypeUid,
          contentItem.itemId,
          {
            publicationState: 'preview' // Include drafts
          }
        );

        if (!entry) {
          console.warn(`⚠️ Entry not found: ${contentItem.contentTypeUid}:${contentItem.itemId}`);
          continue;
        }

        console.log('📋 Found entry:', { id: entry.id, title: entry.Title || entry.title });

        // Extract all translatable content (excluding slug fields)
        const translatableFields = this.extractAllTranslatableFields(entry, contentItem.contentTypeUid);
        console.log('📝 Extracted translatable fields:', translatableFields);
        
        if (translatableFields.length > 0) {
          // Create a record for each translatable field
          for (const field of translatableFields) {
            // Create a unique record ID that includes all necessary metadata
            const recordId = `${contentItem.contentTypeUid}_${contentItem.itemId}_${field.name}`;
            
            // Create a path that includes metadata for easy identification
            const recordPath = `${contentItem.contentTypeUid}/${contentItem.title}/${field.name}`;
            
            const record = {
              id: recordId,
              path: recordPath,
              cells: [
                {
                  columnId: this.formatLanguageCode(sourceLanguage), // Use formatted language code as column ID
                  value: field.value
                },
                // Add metadata cells for bidirectional sync
                {
                  columnId: 'strapi_meta_id',
                  value: contentItem.itemId.toString()
                },
                {
                  columnId: 'strapi_meta_content_type',
                  value: contentItem.contentTypeUid
                },
                {
                  columnId: 'strapi_meta_field_name',
                  value: field.name
                },
                {
                  columnId: 'strapi_meta_field_type',
                  value: this.getFieldTypeFromStrapi(contentItem.contentTypeUid, field.name)
                },
                {
                  columnId: 'strapi_meta_entry_title',
                  value: contentItem.title
                },
                {
                  columnId: 'strapi_meta_created_at',
                  value: entry.createdAt || new Date().toISOString()
                },
                {
                  columnId: 'strapi_meta_updated_at',
                  value: entry.updatedAt || new Date().toISOString()
                },
                {
                  columnId: 'strapi_meta_base_locale',
                  value: entry.locale || sourceLanguage
                }
              ]
            };
            
            //console.log('📋 Created record for field:', field.name, record);
            records.push(record);
          }
        } else {
          console.warn('⚠️ No translatable content found for entry:', entry.id);
        }
      } catch (error) {
        console.error(`❌ Error processing content item:`, contentItem, error);
      }
    }

    console.log('✅ Total records prepared:', records.length);
    return records;
  },

  /**
   * Extract all translatable fields from an entry
   */
  extractAllTranslatableFields(entry, contentTypeUid) {
    const translatableFields = [];
    
    // Fields that should never be translated (unique identifiers, slugs, etc.)
    const excludedFields = ['slug', 'Slug', 'id', 'createdAt', 'updatedAt', 'publishedAt', 'locale', 'localizations'];
    
    // Get content type model to check field types
    let contentTypeModel = null;
    if (contentTypeUid) {
      try {
        contentTypeModel = strapi.getModel(contentTypeUid);
      } catch (error) {
        // Content type not found, continue without type checking
      }
    }
    
    // Helper to check if a field should be excluded
    const shouldExcludeField = (fieldName) => {
      // Check by name
      if (excludedFields.includes(fieldName)) {
        return true;
      }
      
      // Check by field type (uid fields are typically slugs/unique identifiers)
      if (contentTypeModel && contentTypeModel.attributes && contentTypeModel.attributes[fieldName]) {
        const fieldType = contentTypeModel.attributes[fieldName].type;
        if (fieldType === 'uid') {
          return true;
        }
      }
      
      return false;
    };
    
    // Common translatable field names (case-insensitive) - excluding slug
    const titleFields = ['Title', 'title', 'name', 'Name', 'headline', 'Headline', 'label', 'Label'];
    const contentFields = ['Content', 'content', 'body', 'Body', 'description', 'Description', 'text', 'Text', 'summary', 'Summary'];
    
    // Check for title fields
    for (const fieldName of titleFields) {
      if (!shouldExcludeField(fieldName) && entry[fieldName] && typeof entry[fieldName] === 'string' && entry[fieldName].trim().length > 0) {
        translatableFields.push({
          name: fieldName,
          value: entry[fieldName].trim(),
          type: 'title'
        });
      }
    }
    
    // Check for content fields
    for (const fieldName of contentFields) {
      if (!shouldExcludeField(fieldName) && entry[fieldName]) {
        if (Array.isArray(entry[fieldName])) {
          // Handle blocks content
          const textContent = this.extractTextFromBlocks(entry[fieldName]);
          if (textContent && textContent.trim().length > 0) {
            translatableFields.push({
              name: fieldName,
              value: textContent.trim(),
              type: 'content'
            });
          }
        } else if (typeof entry[fieldName] === 'string' && entry[fieldName].trim().length > 0) {
          translatableFields.push({
            name: fieldName,
            value: entry[fieldName].trim(),
            type: 'content'
          });
        }
      }
    }
    
    // Fallback: try to find any other string field that might be translatable
    for (const [key, value] of Object.entries(entry)) {
      // Skip system fields and excluded fields
      if (shouldExcludeField(key)) {
        continue;
      }
      
      // Skip if already processed
      if (translatableFields.some(field => field.name === key)) {
        continue;
      }
      
      if (typeof value === 'string' && value.trim().length > 0) {
        translatableFields.push({
          name: key,
          value: value.trim(),
          type: 'other'
        });
      }
    }
    
    return translatableFields;
  },

  /**
   * Extract translatable content from an entry (legacy method for backward compatibility)
   */
  extractTranslatableContent(entry) {
    const fields = this.extractAllTranslatableFields(entry);
    if (fields.length === 0) {
      return null;
    }
    
    // Return the first field's value for backward compatibility
    return fields[0].value;
  },

  /**
   * Extract text from rich text blocks
   */
  extractTextFromBlocks(blocks) {
    if (!Array.isArray(blocks)) return '';

    const texts = [];
    
    for (const block of blocks) {
      if (block.type === 'paragraph' && block.children) {
        for (const child of block.children) {
          if (child.type === 'text' && child.text) {
            texts.push(child.text);
          }
        }
      }
    }

    return texts.join(' ');
  },

  /**
   * Test Gridly API connection and get view structure
   */
  async testGridlyConnection(gridlyConfig) {
    try {
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        return {
          success: false,
          error: 'API key or View ID is missing'
        };
      }

      // Test by getting view details
      const viewResponse = await axios.get(`https://api.gridly.com/v1/views/${viewId}`, {
        headers: { 'Authorization': `ApiKey ${apiKey}` }
      });

      return {
        success: true,
        data: {
          view: viewResponse.data,
          columns: viewResponse.data.columns || []
        }
      };
    } catch (error) {
      // Extract the actual error message from Gridly API response
      let errorMessage = 'Unknown error occurred';
      let errorDetails = null;
      
      if (error.response?.data) {
        console.error('❌ Gridly API error response:', error.response.data);
        errorDetails = error.response.data;
        
        // Try to extract meaningful error message from Gridly response
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map(err => err.message || err).join(', ');
        } else {
          errorMessage = `Gridly API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      };
    }
  },

  /**
   * Get Gridly view structure to understand available columns
   */
  async getGridlyViewStructure(gridlyConfig) {
    try {
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('API key or View ID is missing');
      }

      // Get columns to understand the view structure
      const response = await axios.get(
        `https://api.gridly.com/v1/views/${viewId}`,
        {
          headers: {
            'Authorization': `ApiKey ${apiKey}`
          }
        }
      );

      // The view response should include columns information
      return response.data.columns || [];
    } catch (error) {
      console.error('Error getting Gridly view structure:', error);
      // If we can't get columns, return empty array and continue
      console.warn('Could not fetch Gridly view structure, proceeding without column validation');
      return [];
    }
  },

  /**
   * Validate and create required metadata columns in Gridly view
   */
  async validateAndCreateMetadataColumns(gridlyConfig, sourceLanguage, targetLanguages, includeDependencies = true) {
    try {
      console.log('🔍 Validating Gridly view columns...');
      
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('API key or View ID is missing');
      }

      // Get current view structure
      const columns = await this.getGridlyViewStructure(gridlyConfig);
      console.log('📋 Current columns:', columns.map(col => ({ id: col.id, name: col.name })));

      // Get available languages from Strapi
      const i18nService = strapi.plugin("gridly-integration").service("i18n");
      const availableLocales = await i18nService.getLocalesWithInfo();
      console.log('📋 Available Strapi locales:', availableLocales);

      // Define required metadata columns
      const requiredMetadataColumns = [
        {
          id: 'strapi_meta_id',
          name: 'Strapi Meta ID',
          type: 'singleLine',
          description: 'Original Strapi entry ID'
        },
        {
          id: 'strapi_meta_content_type',
          name: 'Strapi Meta Content Type',
          type: 'singleLine',
          description: 'Strapi content type UID'
        },
        {
          id: 'strapi_meta_field_name',
          name: 'Strapi Meta Field Name',
          type: 'singleLine',
          description: 'Name of the translatable field'
        },
        {
          id: 'strapi_meta_entry_title',
          name: 'Strapi Meta Entry Title',
          type: 'singleLine',
          description: 'Human-readable entry title'
        },
        {
          id: 'strapi_meta_created_at',
          name: 'Strapi Meta Created At',
          type: 'singleLine',
          description: 'Original creation date'
        },
        {
          id: 'strapi_meta_updated_at',
          name: 'Strapi Meta Updated At',
          type: 'singleLine',
          description: 'Last update date'
        },
        {
          id: 'strapi_meta_base_locale',
          name: 'Strapi Meta Base Locale',
          type: 'singleLine',
          description: 'Source locale code'
        }
      ];

      // Check which metadata columns are missing
      const existingColumnIds = columns.map(col => col.id);
      const missingMetadataColumns = requiredMetadataColumns.filter(col => !existingColumnIds.includes(col.id));

      console.log('📋 Missing metadata columns:', missingMetadataColumns.map(col => col.id));

      // Check and create language columns
      const missingLanguageColumns = [];
      const allLanguages = [sourceLanguage, ...targetLanguages];
      const uniqueLanguages = [...new Set(allLanguages)]; // Remove duplicates
      
      for (const lang of uniqueLanguages) {
        const formattedLangId = this.formatLanguageCode(lang);
        if (!existingColumnIds.includes(formattedLangId)) {
          const locale = availableLocales.find(loc => loc.code === lang);
          if (locale) {
            const isSource = lang === sourceLanguage;
            missingLanguageColumns.push({
              id: formattedLangId,
              name: locale.name,
              languageCode: formattedLangId,
              isSource: isSource,
              isTarget: !isSource,
              localizationType: isSource ? 'sourceLanguage' : 'targetLanguage'
            });
          }
        }
      }

      console.log('📋 Missing language columns:', missingLanguageColumns.map(col => col.id));

      if (missingMetadataColumns.length === 0 && missingLanguageColumns.length === 0) {
        console.log('✅ All required columns already exist');
        return {
          success: true,
          message: 'All required columns already exist',
          columns: columns
        };
      }

      // Create missing columns
      console.log('🔨 Creating missing columns...');
      const createdColumns = [];

      // Create missing metadata columns
      for (const column of missingMetadataColumns) {
        try {
          console.log(`🔨 Creating column: ${column.id}`);
          
          const response = await axios.post(
            `https://api.gridly.com/v1/views/${viewId}/columns`,
            {
              id: column.id,
              editable: true,
              name: column.name,
              type: column.type,
              description: column.description
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${apiKey}`
              }
            }
          );

          createdColumns.push(response.data);
          console.log(`✅ Created metadata column: ${column.id}`);
        } catch (error) {
          console.error(`❌ Error creating metadata column ${column.id}:`, error.response?.data || error.message);
          throw new Error(`Failed to create metadata column ${column.id}: ${error.response?.data?.message || error.message}`);
        }
      }

      // Create missing language columns
      for (const column of missingLanguageColumns) {
        try {
          console.log(`🔨 Creating language column: ${column.id}`);
          
          const response = await axios.post(
            `https://api.gridly.com/v1/views/${viewId}/columns`,
            {
              id: column.id,
              editable: true,
              isSource: column.isSource,
              isTarget: column.isTarget,
              languageCode: column.languageCode,
              localizationType: column.localizationType,
              name: column.name,
              type: 'language'
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${apiKey}`
              }
            }
          );

          createdColumns.push(response.data);
          console.log(`✅ Created language column: ${column.id}`);
        } catch (error) {
          console.error(`❌ Error creating language column ${column.id}:`, error.response?.data || error.message);
          throw new Error(`Failed to create language column ${column.id}: ${error.response?.data?.message || error.message}`);
        }
      }

      const totalCreated = missingMetadataColumns.length + missingLanguageColumns.length;
      console.log(`✅ All required columns created successfully (${totalCreated} total)`);

      let dependencyResult = null;
      if (includeDependencies) {
        // Now validate and create dependencies
        console.log('🔗 Validating language dependencies...');
        dependencyResult = await this.validateAndCreateDependencies(
          gridlyConfig,
          this.formatLanguageCode(sourceLanguage),
          targetLanguages.map(lang => this.formatLanguageCode(lang))
        );

        if (!dependencyResult.success) {
          console.error('❌ Dependency validation failed:', dependencyResult.error);
          throw new Error(`Gridly dependency validation failed: ${dependencyResult.error}`);
        }

        console.log('✅ Dependency validation completed:', dependencyResult.message);
      }

      return {
        success: true,
        message: includeDependencies 
          ? `Created ${totalCreated} columns and ${dependencyResult?.createdDependencies || 0} dependencies`
          : `Created ${totalCreated} columns`,
        createdColumns: createdColumns,
        createdDependencies: dependencyResult?.createdDependencies || 0,
        totalColumns: columns.length + createdColumns.length
      };
    } catch (error) {
      console.error('❌ Error validating/creating metadata columns:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  },

  /**
   * Get all records from Gridly with pagination support
   */
  async getAllGridlyRecords(gridlyConfig, limit = 2000) {
    try {
      console.log('📥 Fetching all records from Gridly with pagination...');
      
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('Gridly API key or View ID is missing');
      }

      const allRecords = [];
      let offset = 0;
      let hasMoreRecords = true;

      while (hasMoreRecords) {
        console.log(`📥 Fetching records with offset: ${offset}, limit: ${limit}`);
        
        const response = await axios.get(
          `https://api.gridly.com/v1/views/${viewId}/records`,
          {
            headers: {
              'Authorization': `ApiKey ${apiKey}`
            },
            params: {
              limit: limit,
              offset: offset
            }
          }
        );

        const records = response.data;
        console.log(`📋 Fetched ${records.length} records for offset ${offset}`);
        
        allRecords.push(...records);
        
        // Check if we have more records to fetch
        if (records.length < limit) {
          hasMoreRecords = false;
        } else {
          offset += limit;
        }
      }

      console.log(`✅ Total records fetched: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error('❌ Error fetching Gridly records:', error);
      throw new Error(`Failed to fetch Gridly records: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Update project and subproject progress based on Gridly records
   */
  async updateProjectProgress(gridlyConfig, projectId) {
    try {
      console.log('🔄 Updating project progress for project:', projectId);
      
      // Get all records from Gridly
      const records = await this.getAllGridlyRecords(gridlyConfig);
      console.log(`📋 Processing ${records.length} records for progress calculation`);

      // Get the project to understand its structure
      const project = await strapi.plugin("gridly-integration").service("project").findOne(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Get target languages from subprojects
      const targetLanguages = [];
      if (project.subprojects && project.subprojects.length > 0) {
        for (const subproject of project.subprojects) {
          const targetLang = subproject['target-language'];
          if (targetLang) {
            targetLanguages.push(this.formatLanguageCode(targetLang));
          }
        }
      }

      console.log('📋 Target languages for progress calculation:', targetLanguages);

      // Calculate progress for each target language
      const progressByLanguage = {};
      let totalTranslationTasks = 0;
      let totalCompletedTasks = 0;

      // Initialize progress counters
      for (const targetLang of targetLanguages) {
        progressByLanguage[targetLang] = {
          translated: 0,
          total: 0
        };
      }

      // Process each record
      for (const record of records) {
        // Skip records that don't have the expected metadata
        const strapiId = this.getCellValue(record, 'strapi_meta_id');
        const contentType = this.getCellValue(record, 'strapi_meta_content_type');
        const fieldName = this.getCellValue(record, 'strapi_meta_field_name');
        
        if (!strapiId || !contentType || !fieldName) {
          console.warn('⚠️ Skipping record with missing metadata:', record.id);
          continue;
        }

        // Check each target language for translation status
        for (const targetLang of targetLanguages) {
          const cell = record.cells.find(c => c.columnId === targetLang);
          if (cell) {
            progressByLanguage[targetLang].total++;
            totalTranslationTasks++;
            
            console.log(`📋 Record ${record.id} - ${targetLang}: dependencyStatus=${cell.dependencyStatus}, value="${cell.value}"`);
            
            // Check if the record is translated (dependencyStatus is "upToDate")
            if (cell.dependencyStatus === 'upToDate' && cell.value && cell.value.trim() !== '') {
              progressByLanguage[targetLang].translated++;
              totalCompletedTasks++;
              console.log(`✅ Record ${record.id} - ${targetLang}: COUNTED AS TRANSLATED`);
            }
          }
        }
      }

      console.log('📊 Progress calculation results:');
      console.log('📋 Total translation tasks:', totalTranslationTasks);
      console.log('📋 Total completed tasks:', totalCompletedTasks);
      console.log('📋 Progress by language:', progressByLanguage);
      
      // Show detailed breakdown
      for (const [lang, progress] of Object.entries(progressByLanguage)) {
        console.log(`📊 ${lang}: ${progress.translated}/${progress.total} = ${Math.round((progress.translated / progress.total) * 100)}%`);
      }

      // Calculate overall progress - total completed translation tasks across all languages
      const overallProgress = totalTranslationTasks > 0 ? Math.round((totalCompletedTasks / totalTranslationTasks) * 100) : 0;
      
      console.log('📊 Overall progress calculation:');
      console.log('📋 Total translation tasks for overall progress:', totalTranslationTasks);
      console.log('📋 Total completed tasks:', totalCompletedTasks);
      console.log('📋 Overall progress percentage:', overallProgress + '%');

      // Update main project progress
      await strapi.plugin("gridly-integration").service("project").update(projectId, {
        data: {
          'overall-progress': overallProgress,
          'last-progress-update': new Date().toISOString()
        }
      });

      console.log('✅ Updated main project progress:', overallProgress + '%');

      // Update subproject progress
      if (project.subprojects && project.subprojects.length > 0) {
        for (const subproject of project.subprojects) {
          const targetLang = this.formatLanguageCode(subproject['target-language']);
          const languageProgress = progressByLanguage[targetLang];
          
          if (languageProgress) {
            const subprojectProgress = languageProgress.total > 0 
              ? Math.round((languageProgress.translated / languageProgress.total) * 100) 
              : 0;

            console.log(`📊 Subproject progress calculation for ${subproject.id}:`);
            console.log(`📋 Target language: ${targetLang}`);
            console.log(`📋 Language progress data:`, languageProgress);
            console.log(`📋 Subproject progress percentage: ${subprojectProgress}%`);

            await strapi.plugin("gridly-integration").service("subproject").update(subproject.id, {
              data: {
                'progress': subprojectProgress,
                'last-progress-update': new Date().toISOString()
              }
            });

            console.log(`✅ Updated subproject ${subproject.id} progress: ${subprojectProgress}% (${languageProgress.translated}/${languageProgress.total})`);
          }
        }
      }

      return {
        success: true,
        overallProgress,
        totalTranslationTasks,
        totalCompletedTasks,
        progressByLanguage
      };
    } catch (error) {
      console.error('❌ Error updating project progress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Import translated content from Gridly back to Strapi
   */
  async importTranslatedContent(gridlyConfig, targetLanguages) {
    try {
      console.log('🔄 Starting import of translated content from Gridly...');
      console.log('📋 Target languages:', targetLanguages);
      
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('Gridly API key or View ID is missing');
      }

      // Get all records from Gridly
      console.log('📥 Fetching records from Gridly...');
      const records = await this.getAllGridlyRecords(gridlyConfig);
      console.log(`📋 Found ${records.length} records in Gridly`);

      // Group records by Strapi entry
      const entriesToUpdate = this.groupRecordsByEntry(records, targetLanguages);
      console.log(`📋 Grouped into ${Object.keys(entriesToUpdate).length} entries to update`);

      // Update Strapi entries with translated content
      const results = [];
      for (const [entryKey, entryData] of Object.entries(entriesToUpdate)) {
        try {
          const result = await this.updateStrapiEntry(entryData);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error updating entry ${entryKey}:`, error.message);
          results.push({
            success: false,
            entryKey,
            error: error.message
          });
        }
      }

      console.log('✅ Import completed');
      return {
        success: true,
        results,
        totalRecords: records.length,
        updatedEntries: results.filter(r => r.success).length
      };
    } catch (error) {
      console.error('❌ Error importing translated content:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  },

  /**
   * Group Gridly records by Strapi entry
   */
  groupRecordsByEntry(records, targetLanguages) {
    const entries = {};

    for (const record of records) {
      // Find metadata cells
      const strapiId = this.getCellValue(record, 'strapi_meta_id');
      const contentType = this.getCellValue(record, 'strapi_meta_content_type');
      const fieldName = this.getCellValue(record, 'strapi_meta_field_name');
      const fieldType = this.getCellValue(record, 'strapi_meta_field_type');
      const entryTitle = this.getCellValue(record, 'strapi_meta_entry_title');
      const baseLocale = this.getCellValue(record, 'strapi_meta_base_locale');

      if (!strapiId || !contentType || !fieldName) {
        continue;
      }

      const entryKey = `${contentType}_${strapiId}`;
      
      if (!entries[entryKey]) {
        entries[entryKey] = {
          strapiId: parseInt(strapiId),
          contentType,
          entryTitle,
          sourceLocale: baseLocale,
          translations: {}
        };
      }

      // Group translations by language
      for (const cell of record.cells) {
        const formattedTargetLanguages = targetLanguages.map(lang => this.formatLanguageCode(lang));
        
        if (formattedTargetLanguages.includes(cell.columnId)) {
          // Only include if cell has a value and is translated (dependencyStatus is "upToDate")
          if (cell.value && cell.dependencyStatus === 'upToDate') {
            // Convert Gridly column ID back to Strapi locale format
            const strapiLocale = this.unformatLanguageCode(cell.columnId);
            if (!entries[entryKey].translations[strapiLocale]) {
              entries[entryKey].translations[strapiLocale] = {};
            }
            
            // Get field type from Gridly metadata
            const gridlyFieldType = fieldType;
            
            // Get actual field type from Strapi schema (more accurate than Gridly metadata)
            // This will properly detect CKEditor, EditorJS, and other custom fields
            const strapiFieldType = this.getFieldTypeFromStrapi(contentType, fieldName);
            const actualFieldType = strapiFieldType || gridlyFieldType;
            
            // Store field type information for processing
            if (!entries[entryKey].fieldTypes) {
              entries[entryKey].fieldTypes = {};
            }
            entries[entryKey].fieldTypes[fieldName] = actualFieldType;
            
            // Process the field value based on its actual type
            const processedValue = this.processFieldData(fieldName, cell.value, actualFieldType);
            entries[entryKey].translations[strapiLocale][fieldName] = processedValue;
          }
        }
      }
    }
    
    return entries;
  },

  /**
   * Get cell value by column ID
   */
  getCellValue(record, columnId) {
    const cell = record.cells.find(c => c.columnId === columnId);
    return cell ? cell.value : null;
  },

  /**
   * Format language code for Gridly (remove dash if present)
   */
  formatLanguageCode(localeCode) {
    // Remove dash from locale codes like 'en-US' -> 'enUS'
    return localeCode.replace('-', '');
  },

  /**
   * Convert Gridly language code back to Strapi locale format (add dash if needed)
   */
  unformatLanguageCode(gridlyCode) {
    // Convert Gridly codes back to Strapi format like 'deDE' -> 'de-DE'
    // This is a simple heuristic - for 4-character codes, add dash after 2nd character
    if (gridlyCode.length === 4 && /^[a-z]{2}[A-Z]{2}$/.test(gridlyCode)) {
      return gridlyCode.substring(0, 2) + '-' + gridlyCode.substring(2, 4);
    }
    return gridlyCode;
  },

  /**
   * Get existing dependencies from Gridly view
   */
  async getGridlyDependencies(gridlyConfig) {
    try {
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('API key or View ID is missing');
      }

      console.log('🔍 Fetching dependencies for view:', viewId);
      
      const response = await axios.get(
        `https://api.gridly.com/v1/views/${viewId}/dependencies`,
        {
          headers: {
            'Authorization': `ApiKey ${apiKey}`
          }
        }
      );

      console.log('📋 Dependencies response:', response.data);
      console.log('📋 Dependencies response type:', typeof response.data);
      console.log('📋 Dependencies response length:', Array.isArray(response.data) ? response.data.length : 'not an array');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting Gridly dependencies:', error.response?.data || error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error statusText:', error.response?.statusText);
      return [];
    }
  },

  /**
   * Create dependency between source and target language columns
   */
  async createGridlyDependency(gridlyConfig, sourceColumnId, targetColumnId) {
    try {
      const { 'gridly-api-key': apiKey, 'gridly-view-id': viewId } = gridlyConfig;
      
      if (!apiKey || !viewId) {
        throw new Error('API key or View ID is missing');
      }

      console.log(`🔗 Creating dependency: ${sourceColumnId} -> ${targetColumnId} in view: ${viewId}`);
      
      const requestBody = {
        sourceColumnId: sourceColumnId,
        targetColumnId: targetColumnId
      };
      
      console.log('📋 Dependency request body:', requestBody);

      const response = await axios.post(
        `https://api.gridly.com/v1/views/${viewId}/dependencies`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${apiKey}`
          }
        }
      );

      console.log('✅ Dependency created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error creating dependency ${sourceColumnId} -> ${targetColumnId}:`, error.response?.data || error.message);
      throw new Error(`Failed to create dependency ${sourceColumnId} -> ${targetColumnId}: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Validate and create dependencies between source and target language columns
   */
  async validateAndCreateDependencies(gridlyConfig, sourceColumnId, targetColumnIds) {
    try {
      console.log('🔍 Checking existing dependencies...');
      console.log('📋 Source column ID:', sourceColumnId);
      console.log('📋 Target column IDs:', targetColumnIds);
      
      // Get existing dependencies
      const existingDependencies = await this.getGridlyDependencies(gridlyConfig);
      console.log('📋 Existing dependencies:', existingDependencies);
      console.log('📋 Existing dependencies type:', typeof existingDependencies);
      console.log('📋 Existing dependencies length:', Array.isArray(existingDependencies) ? existingDependencies.length : 'not an array');

      // Check which target languages already have dependencies with the source
      const existingTargetDependencies = existingDependencies
        .filter(dep => dep.sourceColumnId === sourceColumnId)
        .map(dep => dep.targetColumnId);

      console.log('📋 Existing target dependencies for', sourceColumnId, ':', existingTargetDependencies);

      // Find missing dependencies
      const missingDependencies = targetColumnIds.filter(targetId => 
        !existingTargetDependencies.includes(targetId)
      );

      console.log('📋 Missing dependencies:', missingDependencies);

      if (missingDependencies.length === 0) {
        console.log('✅ All dependencies already exist');
        return {
          success: true,
          message: 'All dependencies already exist',
          createdDependencies: 0
        };
      }

      // Create missing dependencies
      console.log('🔗 Creating missing dependencies...');
      const createdDependencies = [];

      for (const targetColumnId of missingDependencies) {
        try {
          console.log(`🔗 Creating dependency: ${sourceColumnId} -> ${targetColumnId}`);
          
          const dependency = await this.createGridlyDependency(gridlyConfig, sourceColumnId, targetColumnId);
          createdDependencies.push(dependency);
          
          console.log(`✅ Created dependency: ${sourceColumnId} -> ${targetColumnId}`);
        } catch (error) {
          console.error(`❌ Error creating dependency ${sourceColumnId} -> ${targetColumnId}:`, error);
          throw error;
        }
      }

      console.log(`✅ All dependencies created successfully (${createdDependencies.length} total)`);
      return {
        success: true,
        message: `Created ${createdDependencies.length} dependencies`,
        createdDependencies: createdDependencies.length,
        dependencies: createdDependencies
      };
    } catch (error) {
      console.error('❌ Error validating/creating dependencies:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  },

  /**
   * Check if an entry is published
   */
  async isEntryPublished(contentType, entryId) {
    try {
      const entry = await strapi.entityService.findOne(contentType, entryId, {
        publicationState: 'preview' // Use preview to get both draft and published
      });
      return entry && entry.publishedAt !== null;
    } catch (error) {
      console.warn(`⚠️ Could not check publication status for ${contentType}:${entryId}:`, error.message);
      return false;
    }
  },

  /**
   * Update Strapi entry with translated content
   */
  async updateStrapiEntry(entryData) {
    const results = [];

    // Update each language
    for (const [locale, translations] of Object.entries(entryData.translations)) {
      try {
        if (locale === entryData.sourceLocale) {
          // Update the original entry
          // Check if entry is published to update the correct version
          const isPublished = await this.isEntryPublished(entryData.contentType, entryData.strapiId);
          const updateOptions = {
            data: translations
          };
          
          // If published, update the published version, not just the draft
          if (isPublished) {
            updateOptions.publicationState = 'live';
          }
          
          const result = await strapi.entityService.update(
            entryData.contentType,
            entryData.strapiId,
            updateOptions
          );
          
          results.push({
            success: true,
            locale,
            action: 'updated',
            entryId: result.id
          });
        } else {
          // Create or update localization using Strapi i18n API
          const result = await this.createOrUpdateLocalization(
            entryData.contentType,
            entryData.strapiId,
            locale,
            translations
          );
          
          results.push({
            success: true,
            locale,
            action: result.action,
            entryId: result.entryId
          });
        }
      } catch (error) {
        console.error(`❌ Error updating ${locale} for entry ${entryData.strapiId}:`, error.message);
        results.push({
          success: false,
          locale,
          error: error.message
        });
      }
    }

    return {
      success: true,
      entryKey: `${entryData.contentType}_${entryData.strapiId}`,
      results
    };
  },

  /**
   * Create or update localization using Strapi's Entity Service API
   */
  async createOrUpdateLocalization(contentType, entryId, locale, data) {
    try {
      // Get the original entry with its localizations
      const originalEntry = await strapi.entityService.findOne(contentType, entryId, {
        populate: {
          localizations: true
        }
      });
      
      if (!originalEntry) {
        throw new Error(`Original entry ${entryId} not found`);
      }
      
      // Find if localization already exists for this locale
      const existingLocalization = originalEntry.localizations?.find(loc => loc.locale === locale);
      
      if (existingLocalization) {
        // Step 2a: Update existing localization
        // Check if localization is published to update the correct version
        const isPublished = await this.isEntryPublished(contentType, existingLocalization.id);
        const updateOptions = {
          data: data
        };
        
        // If published, update the published version, not just the draft
        if (isPublished) {
          updateOptions.publicationState = 'live';
        }
        
        const updatedLocalization = await strapi.entityService.update(contentType, existingLocalization.id, updateOptions);
        
        return {
          action: 'updated',
          entryId: updatedLocalization.id
        };
        
      } else {
        // Step 2b: Create new localization with proper linking
        // Get the original entry with current localizations
        const originalWithLocalizations = await strapi.entityService.findOne(contentType, entryId, {
          populate: {
            localizations: true
          }
        });
        
        // Get all existing localization IDs
        const existingLocalizationIds = originalWithLocalizations.localizations?.map(loc => loc.id) || [];
        
        // Check if original entry is published - if so, publish the new localization too
        const isOriginalPublished = await this.isEntryPublished(contentType, entryId);
        const createData = {
          ...data,
          locale: locale,
          localizations: [entryId, ...existingLocalizationIds] // Link to original and existing localizations
        };
        
        // If original is published, publish the new localization immediately
        if (isOriginalPublished) {
          createData.published_at = new Date();
        }
        
        // Create the new localization with the localizations field already set
        const newLocalization = await strapi.entityService.create(contentType, {
          data: createData
        });
        
        // Update the original entry to include the new localization using query
        await strapi.query(contentType).update({
          where: { id: entryId },
          data: { localizations: [...existingLocalizationIds, newLocalization.id] }
        });
        
        // Update all existing localizations to include the new one
        for (const existingId of existingLocalizationIds) {
          const otherLocalizationIds = existingLocalizationIds.filter(id => id !== existingId);
          await strapi.query(contentType).update({
            where: { id: existingId },
            data: { localizations: [entryId, ...otherLocalizationIds, newLocalization.id] }
          });
        }
        
        return {
          action: 'created',
          entryId: newLocalization.id
        };
      }
      
    } catch (error) {
      console.error(`❌ Error creating/updating localization for ${locale} (${contentType}:${entryId}):`, error.message);
      throw error;
    }
  },

  /**
   * Get field type from Strapi content type schema
   */
  getFieldTypeFromStrapi(contentType, fieldName) {
    try {
      const model = strapi.getModel(contentType);
      if (!model || !model.attributes || !model.attributes[fieldName]) {
        console.warn(`⚠️ Field ${fieldName} not found in content type ${contentType}`);
        return 'string'; // Default fallback
      }
      
      const field = model.attributes[fieldName];
      
      // Check for CKEditor fields - these store HTML as strings, not blocks
      if (field.customField === 'plugin::ckeditor5.CKEditor' || 
          field.customField === 'plugin::ckeditor.CKEditor') {
        return 'ckeditor';
      }
      
      // Check for EditorJS fields - these use blocks format
      if (field.customField === 'plugin::editorjs.editorjs') {
        return 'richtext';
      }
      
      // Check for rich text fields - multiple ways Strapi can define them
      if (field.type === 'richtext' || 
          field.component === 'default.richtext' || 
          field.type === 'blocks' ||
          (field.type === 'json' && fieldName.toLowerCase().includes('content'))) {
        return 'richtext';
      }
      
      // Check for text fields
      if (field.type === 'text' || field.type === 'string') {
        return 'text';
      }
      
      // Check for title fields (usually string)
      if (fieldName.toLowerCase() === 'title') {
        return 'title';
      }
      
      // Default fallback
      return field.type || 'string';
    } catch (error) {
      console.error(`❌ Error getting field type for ${fieldName} in ${contentType}:`, error);
      return 'string'; // Default fallback
    }
  },

  /**
   * Get actual field structure from Strapi API response
   */
  getFieldStructureFromApi(contentType, entryId) {
    try {
      // This would require making an API call to get the actual structure
      // For now, we'll use a mapping based on common patterns
      const fieldStructureMap = {
        'api::page.page': {
          'Title': 'string',
          'Content': 'blocks',
          'Footer': 'string',
          'LargeContent': 'string' // Based on your API response
        }
      };
      
      return fieldStructureMap[contentType] || {};
    } catch (error) {
      console.error(`❌ Error getting field structure for ${contentType}:${entryId}:`, error);
      return {};
    }
  },

  /**
   * Process field data based on its type (rich text, simple text, etc.)
   */
  processFieldData(fieldName, fieldValue, fieldType) {
    switch (fieldType) {
      case 'title':
      case 'text':
      case 'string':
        // Simple text fields - just return the string value
        return fieldValue;
        
      case 'ckeditor':
        // CKEditor fields store HTML as strings - keep as string, don't convert to blocks
        return fieldValue; // CKEditor expects HTML string, not blocks
        
      case 'richtext':
      case 'blocks':
        // Rich text fields (EditorJS, Strapi blocks) - convert string to Strapi's rich text format
        return this.convertToRichTextBlocks(fieldValue);
        
      case 'content':
        // Legacy support for 'content' type - default to blocks format
        return this.convertToRichTextBlocks(fieldValue);
        
      default:
        // For unknown types, try to determine based on field name
        if (fieldName.toLowerCase().includes('content') || fieldName.toLowerCase().includes('body')) {
          return this.convertToRichTextBlocks(fieldValue);
        } else {
          return fieldValue;
        }
    }
  },

  /**
   * Convert plain text to Strapi's rich text blocks format
   */
  convertToRichTextBlocks(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // Split text into paragraphs (double line breaks)
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs.map(paragraph => ({
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text: paragraph.trim()
        }
      ]
    }));
  }
}); 