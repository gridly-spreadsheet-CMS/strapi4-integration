'use strict';

module.exports = {
    async find(ctx) {
        try {
            return await strapi.plugin("gridly-integration").service("project").find(ctx.query);
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async findOne(ctx) {
        try {
            const { id } = ctx.params;
            return await strapi.plugin("gridly-integration").service("project").findOne(id);
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async create(ctx) {
        try {
            const data = ctx.request.body;
            
            console.log('🔄 Creating project with data:', data);
            
            // Automatically set creation-date
            const projectData = {
                name: data.name,
                "source-language": data["source-language"],
                "creation-date": new Date().toISOString(),
                "selected-content": data["selected-content"] || []
            };
            
            // Add Gridly configuration ID if provided
            if (data.gridlyConfigId) {
                projectData["gridly-config-id"] = data.gridlyConfigId;
            }
            
            console.log('📋 Project data to be created:', projectData);
            
            const project = await strapi.plugin("gridly-integration").service("project").create({ data: projectData });
            
            console.log('✅ Project created:', project);
            
            // Get Gridly configuration if provided
            let gridlyConfig = null;
            if (data.gridlyConfigId) {
                console.log('🔧 Getting Gridly config for ID:', data.gridlyConfigId);
                gridlyConfig = await strapi.plugin("gridly-integration").service("gridlyConfig").findOne(data.gridlyConfigId);
                console.log('📋 Gridly config found:', gridlyConfig ? 'Yes' : 'No');
            }
            
            // Create subproject for each target language
            if (data.targetLanguages && Array.isArray(data.targetLanguages)) {
                console.log('🌍 Creating subprojects for languages:', data.targetLanguages);
                for (const targetLanguage of data.targetLanguages) {
                    const subprojectData = {
                        "target-language": targetLanguage,
                        "progress": 0,
                        "number-of-records": 0,
                        "project": project.id
                    };
                    
                    // Add Gridly settings if configuration is provided
                    if (gridlyConfig) {
                        subprojectData["gridly-api-key"] = gridlyConfig["gridly-api-key"];
                        subprojectData["gridly-view-id"] = gridlyConfig["gridly-view-id"];
                    }
                    
                    console.log('📋 Creating subproject for language:', targetLanguage, subprojectData);
                    await strapi.plugin("gridly-integration").service("subproject").create({
                        data: subprojectData
                    });
                }
            }
            
            // If Gridly config is provided and selected content exists, send to Gridly
            if (gridlyConfig && data["selected-content"] && data["selected-content"].length > 0) {
                console.log('🚀 Attempting to send content to Gridly...');
                try {
                    const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
                    
                    // First, validate and create required metadata columns
                    console.log('🔍 Validating Gridly view columns...');
                    const columnValidation = await gridlyApiService.validateAndCreateMetadataColumns(
                        gridlyConfig, 
                        data["source-language"], 
                        data["targetLanguages"]
                    );
                    
                    if (!columnValidation.success) {
                        console.error('❌ Column validation failed:', columnValidation.error);
                        throw new Error(`Gridly column validation failed: ${columnValidation.error}`);
                    }
                    
                    console.log('✅ Column validation completed:', columnValidation.message);

                    // Then validate and create dependencies
                    console.log('🔗 Validating Gridly dependencies...');
                    const dependencyValidation = await gridlyApiService.validateAndCreateDependencies(
                        gridlyConfig,
                        gridlyApiService.formatLanguageCode(data["source-language"]),
                        data["targetLanguages"].map(lang => gridlyApiService.formatLanguageCode(lang))
                    );
                    if (!dependencyValidation.success) {
                        console.error('❌ Dependency validation failed:', dependencyValidation.error);
                        throw new Error(`Gridly dependency validation failed: ${dependencyValidation.error}`);
                    }
                    
                    console.log('✅ Dependency validation completed:', dependencyValidation.message);
                    
                    // Now send content to Gridly
                    const result = await gridlyApiService.sendContentToGridly(
                        gridlyConfig, 
                        data["selected-content"], 
                        data["source-language"]
                    );
                    
                    console.log('📤 Gridly API result:', result);
                    
                    if (result.success) {
                        // Calculate translation tasks (records × languages)
                        const totalTranslationTasks = data["targetLanguages"].length > 0 
                            ? result.recordsCount * data["targetLanguages"].length
                            : result.recordsCount; // If no target languages, just the records
                        const tasksPerLanguage = data["targetLanguages"].length > 0 
                            ? result.recordsCount
                            : result.recordsCount;
                        console.log('📊 Total translation tasks:', totalTranslationTasks);
                        console.log('📊 Tasks per language:', tasksPerLanguage);
                        console.log('📋 Number of target languages:', data["targetLanguages"].length);
                        
                        // Update project with sync information and total translation tasks count
                        await strapi.plugin("gridly-integration").service("project").update(project.id, {
                            data: {
                                'last-sync': new Date().toISOString(),
                                'sync-status': 'completed',
                                'records-sent': result.recordsCount,
                                'total-records': totalTranslationTasks // Update total translation tasks count
                            }
                        });
                        console.log('✅ Project updated with sync info and total records:', result.recordsCount);
                        
                        // Update subprojects with their language-specific record counts
                        console.log('🔍 Project creation subproject update check:');
                        console.log('  - Target languages length:', data["targetLanguages"]?.length || 0);
                        console.log('  - Tasks per language:', tasksPerLanguage);
                        
                        // Since subprojects were created earlier, we need to find them by project ID
                        if (data["targetLanguages"] && data["targetLanguages"].length > 0) {
                            console.log('📊 Finding and updating subprojects for project:', project.id);
                            
                            // Find all subprojects for this project
                            const subprojects = await strapi.plugin("gridly-integration").service("subproject").find({
                                filters: { project: project.id }
                            });
                            
                            console.log('📋 Found subprojects:', subprojects.length);
                            
                            if (subprojects.length > 0) {
                                console.log('📊 Using target language distribution for subprojects');
                                for (const subproject of subprojects) {
                                    console.log(`  - Updating subproject ${subproject.id} with ${tasksPerLanguage} translation tasks`);
                                    await strapi.plugin("gridly-integration").service("subproject").update(subproject.id, {
                                        data: {
                                            'number-of-records': tasksPerLanguage
                                        }
                                    });
                                }
                                console.log('✅ Updated subproject translation task counts');
                            } else {
                                console.log('⚠️ No subprojects found for project');
                            }
                        } else {
                            console.log('⚠️ No target languages to update subprojects for');
                        }
                    } else {
                        console.error('❌ Failed to send to Gridly:', result.error);
                        
                        // Delete the created project since Gridly sync failed
                        await strapi.plugin("gridly-integration").service("project").delete(project.id);
                        console.log('🗑️ Project deleted due to Gridly sync failure');
                        
                        // Return error to user with the actual Gridly error message
                        const errorResponse = {
                            error: result.error || 'Failed to send content to Gridly',
                            message: result.error || 'Failed to send content to Gridly',
                            details: result.details || result.error
                        };
                        
                        console.log('📤 Sending error response to frontend:', errorResponse);
                        
                        ctx.status = 400;
                        ctx.body = errorResponse;
                        return;
                    }
                } catch (gridlyError) {
                    console.error('❌ Error sending to Gridly:', gridlyError);
                    
                    // Delete the created project since Gridly sync failed
                    await strapi.plugin("gridly-integration").service("project").delete(project.id);
                    console.log('🗑️ Project deleted due to Gridly sync failure');
                    
                    // Return error to user with the actual Gridly error message
                    const errorResponse = {
                        error: gridlyError.message || 'Failed to send content to Gridly',
                        message: gridlyError.message || 'Failed to send content to Gridly',
                        details: gridlyError.details || gridlyError.message
                    };
                    
                    console.log('📤 Sending error response to frontend:', errorResponse);
                    
                    ctx.status = 400;
                    ctx.body = errorResponse;
                    return;
                }
            } else {
                console.log('⚠️ No Gridly config or selected content, skipping Gridly sync');
            }
            
            return project;
        } catch (error) {
            console.error('❌ Error creating project:', error);
            
            // If this is already a structured error from our code, pass it through
            if (error.message && (error.details || error.status)) {
                const errorResponse = {
                    error: error.message,
                    message: error.message,
                    details: error.details || error
                };
                console.log('📤 Sending structured error response to frontend:', errorResponse);
                ctx.status = error.status || 500;
                ctx.body = errorResponse;
                return;
            } else {
                // Otherwise, wrap it in a structured format
                const errorResponse = {
                    error: error.message || 'An unexpected error occurred',
                    message: error.message || 'An unexpected error occurred',
                    details: error
                };
                console.log('📤 Sending wrapped error response to frontend:', errorResponse);
                ctx.status = 500;
                ctx.body = errorResponse;
                return;
            }
        }
    },
    async delete(ctx) {
        try {
            const { id } = ctx.params;
            return await strapi.plugin("gridly-integration").service("project").delete(id);
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async update(ctx) {
        try {
            const { id } = ctx.params;
            const data = ctx.request.body;
            
            // Prevent updating id, creation-date and progress manually
            const { id: bodyId, 'creation-date': creationDate, progress, ...updateData } = data;
            
            return await strapi.plugin("gridly-integration").service("project").update(id, { data: updateData });
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async getLanguages(ctx) {
        try {
            // Use our i18n service to get locales
            const i18nService = strapi.plugin("gridly-integration").service("i18n");
            const locales = await i18nService.getLocalesWithInfo();
            
            // Transform to the format expected by the frontend
            const languages = locales.map(locale => ({
                value: locale.code,
                label: locale.name,
                isDefault: locale.isDefault
            }));
            
            return languages;
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async getGridlyConfigs(ctx) {
        try {
            const configs = await strapi.plugin("gridly-integration").service("gridlyConfig").find();
            return configs;
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async createGridlyConfig(ctx) {
        try {
            const data = ctx.request.body;
            
            // Add the current user as created_by
            // In Strapi 4, the user is available in ctx.state.user
            console.log('Current user:', ctx.state.user);
            if (ctx.state.user && ctx.state.user.id) {
                data.created_by = ctx.state.user.id;
                console.log('Setting created_by to:', ctx.state.user.id);
            } else {
                console.log('No user found in ctx.state.user');
            }
            
            return await strapi.plugin("gridly-integration").service("gridlyConfig").create(data);
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async updateGridlyConfig(ctx) {
        try {
            const { id } = ctx.params;
            const data = ctx.request.body;
            return await strapi.plugin("gridly-integration").service("gridlyConfig").update(id, data);
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async deleteGridlyConfig(ctx) {
        try {
            const { id } = ctx.params;
            return await strapi.plugin("gridly-integration").service("gridlyConfig").delete(id);
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async getContentTypes(ctx) {
        try {
            // Get all content types from Strapi
            const contentTypes = strapi.contentTypes;
            const apiContentTypes = [];
            
            console.log('Available content types:', Object.keys(contentTypes));
            
            // Filter for API content types (excluding admin and plugin content types)
            for (const [uid, contentType] of Object.entries(contentTypes)) {
                console.log(`Checking content type: ${uid}`, {
                    kind: contentType.kind,
                    startsWithApi: uid.startsWith('api::'),
                    isCollectionType: contentType.kind === 'collectionType',
                    isVisible: contentType.pluginOptions?.['content-manager']?.visible !== false,
                    displayName: contentType.info?.displayName
                });
                
                // Check for API content types (both api:: and application:: prefixes)
                const isApiContentType = (uid.startsWith('api::') || uid.startsWith('application::')) && contentType.kind === 'collectionType';
                
                if (isApiContentType) {
                    // Check if content type is visible in content manager
                    // Default to visible if no pluginOptions are set
                    const isVisible = contentType.pluginOptions?.['content-manager']?.visible !== false;
                    
                    console.log(`Content type ${uid} visibility:`, {
                        hasPluginOptions: !!contentType.pluginOptions,
                        contentManagerVisible: contentType.pluginOptions?.['content-manager']?.visible,
                        isVisible: isVisible
                    });
                    
                    // Include all API content types for now, regardless of visibility
                    // This ensures we don't miss any content types
                    apiContentTypes.push({
                        uid: uid,
                        displayName: contentType.info.displayName,
                        collectionName: contentType.collectionName,
                        singularName: contentType.info.singularName,
                        pluralName: contentType.info.pluralName
                    });
                }
            }
            
            console.log('Found API content types:', apiContentTypes);
            return apiContentTypes;
        } catch (error) {
            console.error('Error in getContentTypes:', error);
            ctx.throw(500, error);
        }
    },
    async getContentTypeEntries(ctx) {
        try {
            const { contentTypeUid } = ctx.params;
            const { locale } = ctx.query; // Get locale from query params
            
            console.log('Fetching entries for content type:', contentTypeUid, 'locale:', locale);
            
            // Validate that the content type exists and is accessible
            const contentType = strapi.contentTypes[contentTypeUid];
            if (!contentType || (!contentTypeUid.startsWith('api::') && !contentTypeUid.startsWith('application::'))) {
                console.error('Invalid content type:', contentTypeUid);
                ctx.throw(400, 'Invalid content type');
            }
            
            console.log('Content type found:', {
                uid: contentType.uid,
                displayName: contentType.info?.displayName,
                attributes: Object.keys(contentType.attributes || {})
            });
            
            // Get all available fields from the content type
            const availableFields = Object.keys(contentType.attributes || {});
            console.log('Available fields:', availableFields);
            
            // Build query with optional locale filter
            const query = {
                sort: { createdAt: 'desc' },
                populate: {} // No relations for performance
            };
            
            // Add locale filter if specified and i18n is available
            if (locale) {
                const i18nService = strapi.plugin("gridly-integration").service("i18n");
                if (i18nService.isI18nAvailable()) {
                    query.filters = {
                        locale: locale
                    };
                }
            }
            
            // Always include drafts in our plugin's API
            query.publicationState = 'preview';
            
            // Try to get entries without specifying fields first (this should return all fields)
            let entries;
            try {
                console.log('Trying to get entries without field specification');
                entries = await strapi.entityService.findMany(contentTypeUid, query);
            } catch (noFieldError) {
                console.log('Error without field specification, trying with all fields:', noFieldError.message);
                try {
                    console.log('Trying to get entries with all fields:', availableFields);
                    entries = await strapi.entityService.findMany(contentTypeUid, {
                        ...query,
                        fields: availableFields
                    });
                } catch (fieldError) {
                    console.log('Error with all fields, trying with basic fields:', fieldError.message);
                    // Fallback to basic fields if the above fails
                    entries = await strapi.entityService.findMany(contentTypeUid, {
                        ...query,
                        fields: ['id']
                    });
                }
            }
            
            console.log('Raw entries found:', entries.length, entries);
            
            // Transform entries to include a display title
            const transformedEntries = entries.map(entry => {
                let title = '';
                
                console.log('Processing entry:', entry);
                
                // Try to find a suitable title field (case-insensitive)
                const entryKeys = Object.keys(entry);
                console.log('Entry keys:', entryKeys);
                
                const titleKey = entryKeys.find(key => 
                    key.toLowerCase() === 'title' || 
                    key.toLowerCase() === 'name' || 
                    key.toLowerCase() === 'slug' || 
                    key.toLowerCase() === 'headline' || 
                    key.toLowerCase() === 'label'
                );
                
                console.log('Found title key:', titleKey);
                
                if (titleKey) {
                    title = entry[titleKey];
                    console.log('Using title from key:', titleKey, 'Value:', title);
                } else {
                    // Fallback to ID if no title field found
                    title = `Entry ${entry.id}`;
                    console.log('No title field found, using fallback:', title);
                }
                
                return {
                    id: entry.id,
                    title: title,
                    locale: entry.locale || null // Include locale info if available
                };
            });
            
            console.log('Transformed entries:', transformedEntries);
            return transformedEntries;
        } catch (error) {
            console.error('Error in getContentTypeEntries:', error);
            ctx.throw(500, error);
        }
    },
    async sendContentToGridly(ctx) {
        try {
            const { projectId } = ctx.params;
            const { selectedContent, sourceLanguage } = ctx.request.body;
            
            console.log('Sending content to Gridly for project:', projectId);
            console.log('Selected content:', selectedContent);
            console.log('Source language:', sourceLanguage);
            
            // Get the project to find the Gridly configuration
            const project = await strapi.plugin("gridly-integration").service("project").findOne(projectId);
            if (!project) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Project not found',
                    message: 'Project not found'
                };
                return;
            }
            
            // Get the Gridly configuration
            let gridlyConfig = null;
            
            if (project['gridly-config-id']) {
                // Handle both relation object and direct ID
                let configId = project['gridly-config-id'];
                if (typeof configId === 'object' && configId.id) {
                    configId = configId.id;
                }
                
                if (configId) {
                    gridlyConfig = await strapi.plugin("gridly-integration").service("gridlyConfig").findOne(configId);
                }
            }
            if (!gridlyConfig) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Gridly configuration not found',
                    message: 'Gridly configuration not found'
                };
                return;
            }
            
            // Send content to Gridly
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            const result = await gridlyApiService.sendContentToGridly(gridlyConfig, selectedContent, sourceLanguage);
            
            if (result.success) {
                // Update project with sync information
                await strapi.plugin("gridly-integration").service("project").update(projectId, {
                    data: {
                        'last-sync': new Date().toISOString(),
                        'sync-status': 'completed',
                        'records-sent': result.recordsCount
                    }
                });
                
                return {
                    success: true,
                    message: `Successfully sent ${result.recordsCount} records to Gridly`,
                    data: result.data
                };
            } else {
                // Update project with error information
                await strapi.plugin("gridly-integration").service("project").update(projectId, {
                    data: {
                        'last-sync': new Date().toISOString(),
                        'sync-status': 'failed',
                        'sync-error': result.error
                    }
                });
                
                ctx.status = 400;
                ctx.body = {
                    error: result.error || 'Failed to send content to Gridly',
                    message: result.error || 'Failed to send content to Gridly',
                    details: result.details || result.error
                };
                return;
            }
        } catch (error) {
            console.error('Error sending content to Gridly:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message || 'An unexpected error occurred',
                message: error.message || 'An unexpected error occurred',
                details: error
            };
            return;
        }
    },
    async testGridlyConnection(ctx) {
        try {
            const { configId } = ctx.params;
            
            // Get the Gridly configuration
            const gridlyConfig = await strapi.plugin("gridly-integration").service("gridlyConfig").findOne(configId);
            if (!gridlyConfig) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Gridly configuration not found',
                    message: 'Gridly configuration not found'
                };
                return;
            }
            
            // Test the connection
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            const result = await gridlyApiService.testGridlyConnection(gridlyConfig);
            
            return result;
        } catch (error) {
            console.error('Error testing Gridly connection:', error);
            
            // If this is already a structured error from our code, pass it through
            if (error.message && (error.details || error.status)) {
                const errorResponse = {
                    error: error.message,
                    message: error.message,
                    details: error.details || error
                };
                ctx.status = error.status || 500;
                ctx.body = errorResponse;
                return;
            } else {
                // Otherwise, wrap it in a structured format
                const errorResponse = {
                    error: error.message || 'An unexpected error occurred',
                    message: error.message || 'An unexpected error occurred',
                    details: error
                };
                ctx.status = 500;
                ctx.body = errorResponse;
                return;
            }
        }
    },

    /**
     * Validate and create required metadata columns in Gridly view
     */
    async validateGridlyColumns(ctx) {
        try {
            const { configId } = ctx.params;
            const { sourceLanguage, targetLanguages } = ctx.request.body;
            
            // Get the Gridly configuration
            const gridlyConfig = await strapi.plugin("gridly-integration").service("gridlyConfig").findOne(configId);
            if (!gridlyConfig) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Gridly configuration not found',
                    message: 'Gridly configuration not found'
                };
                return;
            }
            
            // Validate and create columns
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            const result = await gridlyApiService.validateAndCreateMetadataColumns(
                gridlyConfig, 
                sourceLanguage, 
                targetLanguages
            );
            
            return result;
        } catch (error) {
            console.error('Error validating Gridly columns:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message || 'An unexpected error occurred',
                message: error.message || 'An unexpected error occurred',
                details: error
            };
            return;
        }
    },

    /**
     * Sync content to Gridly (validate columns and send content)
     */
    async syncToGridly(ctx) {
        try {
            const { projectId } = ctx.params;
            
            console.log('🔄 Syncing content to Gridly for project:', projectId);
            
            // Get the project
            const project = await strapi.plugin("gridly-integration").service("project").findOne(projectId);
            if (!project) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Project not found',
                    message: 'Project not found'
                };
                return;
            }
            
            // Get the Gridly configuration - for now, get the first available config
            const gridlyConfigs = await strapi.plugin("gridly-integration").service("gridlyConfig").find();
            if (!gridlyConfigs || gridlyConfigs.length === 0) {
                ctx.status = 400;
                ctx.body = {
                    error: 'No Gridly configuration found',
                    message: 'No Gridly configuration found. Please create a Gridly configuration first.'
                };
                return;
            }
            
            const gridlyConfig = gridlyConfigs[0]; // Use the first available config
            if (!gridlyConfig) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Gridly configuration not found',
                    message: 'Gridly configuration not found'
                };
                return;
            }
            
            // Check if project has selected content
            if (!project['selected-content'] || project['selected-content'].length === 0) {
                ctx.status = 400;
                ctx.body = {
                    error: 'No content selected for sync',
                    message: 'No content selected for sync'
                };
                return;
            }
            
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            
            // Check if project has target languages - try to get from subprojects first, then use default
            let targetLanguages = project['targetLanguages'];
            
            // If project doesn't have targetLanguages stored, try to get from subprojects
            if (!targetLanguages || targetLanguages.length === 0) {
                console.log('📋 Project has no targetLanguages stored, checking subprojects...');
                if (project.subprojects && project.subprojects.length > 0) {
                    targetLanguages = project.subprojects.map(subproject => subproject['target-language']).filter(Boolean);
                    console.log('📋 Target languages from subprojects:', targetLanguages);
                }
            }
            
            // If still no target languages, use default
            if (!targetLanguages || targetLanguages.length === 0) {
                targetLanguages = ['de-DE', 'sv-SE']; // Default target languages
                console.log('📋 Using default target languages:', targetLanguages);
            }
            
            console.log('📋 Project targetLanguages field:', project['targetLanguages']);
            console.log('📋 Original target languages:', targetLanguages);
            console.log('📋 Source language:', project['source-language']);
            console.log('📋 Target languages type:', typeof targetLanguages);
            console.log('📋 Target languages is array:', Array.isArray(targetLanguages));
            
            // Ensure source language is not in target languages
            const filteredTargetLanguages = targetLanguages.filter(lang => lang !== project['source-language']);
            
            console.log('📋 Filtered target languages:', filteredTargetLanguages);
            console.log('📋 Filtered target languages length:', filteredTargetLanguages.length);
            
            // First, validate and create required columns (without dependencies)
            console.log('🔍 Validating Gridly view columns...');
            const columnValidation = await gridlyApiService.validateAndCreateMetadataColumns(
                gridlyConfig, 
                project['source-language'], 
                filteredTargetLanguages,
                false // Don't include dependencies here, we'll handle them separately
            );
            
            if (!columnValidation.success) {
                console.error('❌ Column validation failed:', columnValidation.error);
                throw new Error(`Gridly column validation failed: ${columnValidation.error}`);
            }
            
            console.log('✅ Column validation completed:', columnValidation.message);

            // Then validate and create dependencies (same as project creation)
            console.log('🔗 Validating Gridly dependencies...');
            console.log('📋 Source language:', project['source-language']);
            console.log('📋 Filtered target languages:', filteredTargetLanguages);
            console.log('📋 Formatted source language:', gridlyApiService.formatLanguageCode(project['source-language']));
            console.log('📋 Formatted target languages:', filteredTargetLanguages.map(lang => gridlyApiService.formatLanguageCode(lang)));
            
            const dependencyValidation = await gridlyApiService.validateAndCreateDependencies(
                gridlyConfig,
                gridlyApiService.formatLanguageCode(project['source-language']),
                filteredTargetLanguages.map(lang => gridlyApiService.formatLanguageCode(lang))
            );
            
            console.log('📋 Dependency validation result:', {
                success: dependencyValidation.success,
                message: dependencyValidation.message,
                createdDependencies: dependencyValidation.createdDependencies,
                error: dependencyValidation.error
            });
            
            if (!dependencyValidation.success) {
                console.error('❌ Dependency validation failed:', dependencyValidation.error);
                throw new Error(`Gridly dependency validation failed: ${dependencyValidation.error}`);
            }
            
            console.log('✅ Dependency validation completed:', dependencyValidation.message);
            
            // Now send content to Gridly
            const result = await gridlyApiService.sendContentToGridly(
                gridlyConfig, 
                project['selected-content'], 
                project['source-language']
            );
            
            if (result.success) {
                console.log('✅ Sync completed successfully');
                
                // Calculate translation tasks (records × languages)
                const totalTranslationTasks = filteredTargetLanguages.length > 0 
                    ? result.recordsCount * filteredTargetLanguages.length
                    : result.recordsCount; // If no target languages, just the records
                const tasksPerLanguage = filteredTargetLanguages.length > 0 
                    ? result.recordsCount
                    : result.recordsCount;
                console.log('📊 Total translation tasks:', totalTranslationTasks);
                console.log('📊 Tasks per language:', tasksPerLanguage);
                console.log('📋 Number of target languages:', filteredTargetLanguages.length);
                
                // Update project with sync information and total translation tasks count
                await strapi.plugin("gridly-integration").service("project").update(projectId, {
                    data: {
                        'last-sync': new Date().toISOString(),
                        'records-sent': result.recordsCount,
                        'total-records': totalTranslationTasks // Update total translation tasks count
                    }
                });
                
                // Update subprojects with their language-specific record counts
                console.log('🔍 Sync subproject update check:');
                console.log('  - Has subprojects:', !!project.subprojects);
                console.log('  - Subprojects length:', project.subprojects?.length || 0);
                console.log('  - Filtered target languages length:', filteredTargetLanguages?.length || 0);
                console.log('  - Tasks per language:', tasksPerLanguage);
                
                if (project.subprojects && project.subprojects.length > 0 && filteredTargetLanguages.length > 0) {
                    console.log('📊 Using target language distribution for subprojects');
                    for (const subproject of project.subprojects) {
                        console.log(`  - Updating subproject ${subproject.id} with ${tasksPerLanguage} translation tasks`);
                        await strapi.plugin("gridly-integration").service("subproject").update(subproject.id, {
                            data: {
                                'number-of-records': tasksPerLanguage
                            }
                        });
                    }
                    console.log('✅ Updated subproject translation task counts');
                } else {
                    console.log('⚠️ No subprojects or target languages to update');
                    
                    // Fallback: Update subprojects with equal distribution of total translation tasks
                    if (project.subprojects && project.subprojects.length > 0) {
                        const tasksPerSubproject = Math.ceil(totalTranslationTasks / project.subprojects.length);
                        console.log('📊 Fallback: Translation tasks per subproject:', tasksPerSubproject);
                        
                        for (const subproject of project.subprojects) {
                            console.log(`  - Updating subproject ${subproject.id} with ${tasksPerSubproject} translation tasks (fallback)`);
                            await strapi.plugin("gridly-integration").service("subproject").update(subproject.id, {
                                data: {
                                    'number-of-records': tasksPerSubproject
                                }
                            });
                        }
                                        console.log('✅ Updated subproject translation task counts (fallback)');
            }
        }

        // Update progress from Gridly as the final step
        console.log('🔄 Updating progress from Gridly...');
        const progressResult = await gridlyApiService.updateProjectProgress(gridlyConfig, projectId);
        
        if (progressResult.success) {
            console.log('✅ Progress updated successfully:', progressResult.overallProgress + '%');
        } else {
            console.warn('⚠️ Failed to update progress:', progressResult.error);
        }
        
        return {
            success: true,
            message: `Successfully synced ${result.recordsCount} records to Gridly and updated progress`,
            data: result.data,
            columnValidation: columnValidation,
            progressUpdate: progressResult
        };
            } else {
                // Update project with error information (but don't update last-sync)
                await strapi.plugin("gridly-integration").service("project").update(projectId, {
                    data: {
                        'sync-error': result.error
                    }
                });
                
                ctx.status = 400;
                ctx.body = {
                    error: result.error || 'Failed to sync content to Gridly',
                    message: result.error || 'Failed to sync content to Gridly',
                    details: result.details || result.error
                };
                return;
            }
        } catch (error) {
            console.error('Error syncing to Gridly:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message || 'An unexpected error occurred',
                message: error.message || 'An unexpected error occurred',
                details: error
            };
            return;
        }
    },

    /**
     * Validate Gridly view dependencies
     */
    async validateGridlyDependencies(ctx) {
        try {
            const { configId } = ctx.params;
            const { sourceLanguage, targetLanguages } = ctx.request.body;
            
            console.log('🔗 Validating Gridly dependencies for config:', configId);
            console.log('📋 Source language:', sourceLanguage);
            console.log('📋 Target languages:', targetLanguages);
            
            // Get the Gridly configuration
            const gridlyConfig = await strapi.plugin("gridly-integration").service("gridlyConfig").findOne(configId);
            if (!gridlyConfig) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Gridly configuration not found',
                    message: 'Gridly configuration not found'
                };
                return;
            }
            
            // Validate dependencies
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            const result = await gridlyApiService.validateAndCreateDependencies(
                gridlyConfig, 
                gridlyApiService.formatLanguageCode(sourceLanguage), 
                targetLanguages.map(lang => gridlyApiService.formatLanguageCode(lang))
            );
            
            return result;
        } catch (error) {
            console.error('Error validating Gridly dependencies:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message || 'An unexpected error occurred',
                message: error.message || 'An unexpected error occurred',
                details: error
            };
            return;
        }
    },

    /**
     * Update project progress from Gridly
     */
    async updateProgressFromGridly(ctx) {
        try {
            const { projectId } = ctx.params;
            
            console.log('🔄 Updating progress from Gridly for project:', projectId);
            
            // Get the project to find the Gridly configuration
            const project = await strapi.plugin("gridly-integration").service("project").findOne(projectId);
            if (!project) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Project not found',
                    message: 'Project not found'
                };
                return;
            }
            
            // Get the Gridly configuration
            const gridlyConfigs = await strapi.plugin("gridly-integration").service("gridlyConfig").find();
            if (!gridlyConfigs || gridlyConfigs.length === 0) {
                ctx.status = 400;
                ctx.body = {
                    error: 'No Gridly configuration found',
                    message: 'No Gridly configuration found. Please create a Gridly configuration first.'
                };
                return;
            }
            
            const gridlyConfig = gridlyConfigs[0]; // Use the first available config
            
            // Update progress from Gridly
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            const result = await gridlyApiService.updateProjectProgress(gridlyConfig, projectId);
            
            if (result.success) {
                return {
                    success: true,
                    message: `Successfully updated progress. Overall: ${result.overallProgress}%`,
                    data: result
                };
            } else {
                ctx.status = 500;
                ctx.body = {
                    error: result.error || 'Failed to update progress',
                    message: result.error || 'Failed to update progress'
                };
                return;
            }
        } catch (error) {
            console.error('Error updating progress from Gridly:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message || 'An unexpected error occurred',
                message: error.message || 'An unexpected error occurred',
                details: error
            };
            return;
        }
    },

    /**
     * Import translated content from Gridly back to Strapi
     */
    async importFromGridly(ctx) {
        try {
            const { projectId } = ctx.params;
            const { targetLanguages } = ctx.request.body;
            
            console.log('🔄 Importing content from Gridly for project:', projectId);
            console.log('📋 Target languages:', targetLanguages);
            
            // Get the project to find the Gridly configuration
            const project = await strapi.plugin("gridly-integration").service("project").findOne(projectId);
            if (!project) {
                ctx.status = 404;
                ctx.body = {
                    error: 'Project not found',
                    message: 'Project not found'
                };
                return;
            }
            
            // Get the Gridly configuration
            let gridlyConfig = null;
            
            if (project['gridly-config-id']) {
                // Handle both relation object and direct ID
                let configId = project['gridly-config-id'];
                if (typeof configId === 'object' && configId.id) {
                    configId = configId.id;
                }
                
                if (configId) {
                    gridlyConfig = await strapi.plugin("gridly-integration").service("gridlyConfig").findOne(configId);
                }
            }
            
            // If no specific config is set or found, use the first available config
            if (!gridlyConfig) {
                console.log('⚠️ No specific Gridly config found, using first available config');
                const allConfigs = await strapi.plugin("gridly-integration").service("gridlyConfig").find();
                if (allConfigs && allConfigs.length > 0) {
                    gridlyConfig = allConfigs[0];
                    console.log('✅ Using first available Gridly config:', gridlyConfig.id);
                } else {
                    ctx.status = 404;
                    ctx.body = {
                        error: 'No Gridly configuration found',
                        message: 'No Gridly configuration found. Please create a Gridly configuration first.'
                    };
                    return;
                }
            }
            
            // Import content from Gridly
            const gridlyApiService = strapi.plugin("gridly-integration").service("gridlyApi");
            
            if (!gridlyApiService) {
                throw new Error('Gridly API service not found');
            }
            
            const result = await gridlyApiService.importTranslatedContent(gridlyConfig, targetLanguages);
            
            if (result.success) {
                // Update project with import information
                await strapi.plugin("gridly-integration").service("project").update(projectId, {
                    data: {
                        'last-import': new Date().toISOString(),
                        'import-status': 'completed',
                        'entries-imported': result.updatedEntries
                    }
                });
                
                return {
                    success: true,
                    message: `Successfully imported ${result.updatedEntries} entries from Gridly. Translations are now linked to their original entries. To view them: Go to Content Manager → Page → Switch locale to the target language.`,
                    data: result
                };
            } else {
                // Update project with error information
                await strapi.plugin("gridly-integration").service("project").update(projectId, {
                    data: {
                        'last-import': new Date().toISOString(),
                        'import-status': 'failed',
                        'import-error': result.error
                    }
                });
                
                ctx.status = 400;
                ctx.body = {
                    error: result.error || 'Failed to import content from Gridly',
                    message: result.error || 'Failed to import content from Gridly',
                    details: result.details || result.error
                };
                return;
            }
        } catch (error) {
            console.error('Error importing from Gridly:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message || 'An unexpected error occurred',
                message: error.message || 'An unexpected error occurred',
                details: error
            };
            return;
        }
    },

    async cleanupDuplicateEntries(ctx) {
        try {
            console.log('🧹 Starting cleanup of duplicate German entries...');
            
            // Get all German entries
            const germanEntries = await strapi.entityService.findMany('api::page.page', {
                filters: {
                    locale: 'de-DE'
                },
                sort: { createdAt: 'desc' }
            });
            
            console.log(`📋 Found ${germanEntries.length} German entries`);
            
            // Find entries with "TEST TITLE IN GERMAN CHANGED" (our import entries)
            const importEntries = germanEntries.filter(entry => 
                entry.Title === 'TEST TITLE IN GERMAN CHANGED'
            );
            
            console.log(`📋 Found ${importEntries.length} import entries to clean up`);
            
            // Delete the import entries
            for (const entry of importEntries) {
                console.log(`🗑️ Deleting entry ${entry.id}: ${entry.Title}`);
                await strapi.entityService.delete('api::page.page', entry.id);
            }
            
            console.log('✅ Cleanup completed successfully');
            console.log(`🗑️ Deleted ${importEntries.length} duplicate entries`);
            
            return {
                success: true,
                message: `Successfully deleted ${importEntries.length} duplicate entries`,
                deletedCount: importEntries.length
            };
            
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            ctx.status = 500;
            ctx.body = {
                error: error.message,
                message: 'Failed to cleanup duplicate entries'
            };
        }
    },

    async updateExistingProjectsWithConfig(ctx) {
        try {
            console.log('🔄 Updating existing projects with Gridly configuration...');
            
            // Get all projects
            const projects = await strapi.plugin("gridly-integration").service("project").find();
            let updatedCount = 0;
            
            for (const project of projects) {
                // Check if project already has gridly-config-id
                if (project['gridly-config-id']) {
                    console.log(`✅ Project ${project.id} already has gridly-config-id: ${project['gridly-config-id']}`);
                    continue;
                }
                
                // Get subprojects for this project
                const subprojects = await strapi.plugin("gridly-integration").service("subproject").find({
                    filters: { project: project.id }
                });
                
                if (subprojects && subprojects.length > 0) {
                    // Check if any subproject has gridly-api-key and gridly-view-id
                    const subprojectWithConfig = subprojects.find(sub => sub['gridly-api-key'] && sub['gridly-view-id']);
                    
                    if (subprojectWithConfig) {
                        // Find matching Gridly configuration
                        const configs = await strapi.plugin("gridly-integration").service("gridlyConfig").find();
                        const matchingConfig = configs.find(config => 
                            config['gridly-api-key'] === subprojectWithConfig['gridly-api-key'] &&
                            config['gridly-view-id'] === subprojectWithConfig['gridly-view-id']
                        );
                        
                        if (matchingConfig) {
                            // Update project with the matching configuration
                            await strapi.plugin("gridly-integration").service("project").update(project.id, {
                                data: { 'gridly-config-id': matchingConfig.id }
                            });
                            console.log(`✅ Updated project ${project.id} with gridly-config-id: ${matchingConfig.id}`);
                            updatedCount++;
                        } else {
                            console.log(`⚠️ No matching Gridly config found for project ${project.id}`);
                        }
                    } else {
                        console.log(`⚠️ No subproject with Gridly config found for project ${project.id}`);
                    }
                } else {
                    console.log(`⚠️ No subprojects found for project ${project.id}`);
                }
            }
            
            console.log(`✅ Updated ${updatedCount} projects with Gridly configuration`);
            
            return {
                success: true,
                message: `Updated ${updatedCount} projects with Gridly configuration`,
                updatedCount
            };
        } catch (error) {
            console.error('❌ Error updating projects with Gridly configuration:', error);
            ctx.throw(500, error);
        }
    }
};