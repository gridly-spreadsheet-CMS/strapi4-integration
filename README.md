# Gridly Integration Plugin for Strapi 4

A comprehensive Strapi 4 plugin that seamlessly integrates with [Gridly](https://gridly.com), enabling bidirectional synchronization of translatable content between Strapi and Gridly's translation management platform.

## Overview

The Gridly Integration plugin allows you to:
- Export translatable content from Strapi to Gridly for professional translation workflows
- Import translated content back into Strapi with proper i18n localization support
- Track translation progress across multiple languages
- Automatically sync content changes in the background
- Manage translation projects with multiple target languages

## Features

### Core Functionality

- **Content Export**: Automatically extract and send translatable fields from Strapi content types to Gridly
- **Content Import**: Import completed translations from Gridly back into Strapi with proper locale linking
- **Progress Tracking**: Real-time progress tracking for translation projects across all target languages
- **Background Sync**: Automatic background synchronization of content changes (runs every 60 seconds)
- **Multi-language Support**: Support for multiple target languages per project
- **Metadata Preservation**: Maintains metadata about source entries, content types, and field mappings

### Gridly Integration

- **Column Management**: Automatically creates and validates required columns in Gridly views
- **Dependency Management**: Sets up language dependencies between source and target languages
- **Connection Testing**: Test Gridly API connections before syncing
- **Batch Processing**: Handles large content sets with batch processing (1000 records per batch)

### Strapi Integration

- **i18n Support**: Full integration with Strapi's i18n plugin for locale management
- **Content Type Detection**: Automatically detects and lists available API content types
- **Field Type Detection**: Intelligently detects field types (text, richtext, blocks, etc.)
- **Draft Support**: Includes draft entries in content selection
- **Localization Linking**: Properly links imported translations to original entries using Strapi's localization system

## Installation

### Prerequisites

- Strapi 4.x
- Node.js >= 18.0.0 <= 20.x.x
- npm >= 6.0.0
- Gridly account and API key

### Install the Plugin

1. Copy the plugin directory to your Strapi project:
   ```bash
   cp -r gridly-integration src/plugins/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Rebuild the admin panel:
   ```bash
   npm run build
   ```

4. Restart your Strapi server

### Enable the Plugin

The plugin should be automatically registered. Access it via the Strapi admin panel sidebar under "Gridly Integration".

## Configuration

### Gridly Configuration

Before creating translation projects, you need to configure your Gridly connection:

1. Navigate to **Gridly Integration** in the Strapi admin panel
2. Click **Configurations** to manage Gridly settings
3. Create a new configuration with:
   - **Name**: A descriptive name for this configuration
   - **Gridly API Key**: Your Gridly API key (stored securely)
   - **Gridly View ID**: The ID of the Gridly view where translations will be managed
   - **Description**: Optional description

### Content Type Setup

Ensure your content types have translatable fields. The plugin automatically detects:
- Text fields (`string`, `text`)
- Rich text fields (`richtext`, `blocks`)
- Common field names (`Title`, `title`, `Content`, `content`, `Description`, `description`, etc.)

## Usage

### Creating a Translation Project

1. Navigate to **Gridly Integration** → **Projects**
2. Click **Add New Project**
3. Fill in the project details:
   - **Project Name**: Unique name for the project
   - **Source Language**: The language of your original content
   - **Target Languages**: Select one or more target languages
   - **Gridly Configuration**: Select your configured Gridly connection
   - **Selected Content**: Choose content entries to translate

4. Click **Create Project**

The plugin will:
- Create the project and subprojects for each target language
- Validate and create required columns in Gridly
- Set up language dependencies
- Send content to Gridly

### Syncing Content to Gridly

You can sync content to Gridly at any time:

1. Open your project
2. Click **Sync to Gridly**
3. The plugin will:
   - Validate Gridly columns and dependencies
   - Send updated content to Gridly
   - Update progress tracking

### Importing Translations

Once translations are completed in Gridly:

1. Open your project
2. Click **Import from Gridly**
3. Select target languages to import
4. The plugin will:
   - Fetch translated records from Gridly
   - Create or update localized entries in Strapi
   - Link translations to original entries

### Viewing Translations

After importing, view translations in Strapi:

1. Go to **Content Manager**
2. Select your content type (e.g., Page)
3. Use the locale switcher to view different language versions
4. Translations are properly linked and can be edited independently

### Progress Tracking

The plugin tracks translation progress:

- **Overall Progress**: Percentage of completed translations across all languages
- **Language-specific Progress**: Progress for each target language
- **Record Counts**: Number of translation tasks per language

Update progress manually by clicking **Update Progress** or let the background sync handle it automatically.

## Architecture

### Content Types

The plugin creates three content types:

#### `gridly-project`
Main project entity containing:
- Project name and metadata
- Source language
- Selected content (JSON array)
- Gridly configuration reference
- Sync and import status
- Progress tracking

#### `gridly-subproject`
Represents a target language within a project:
- Target language code
- Translation progress (0-100%)
- Number of records
- Gridly API settings

#### `gridly-config`
Stores Gridly connection configurations:
- Configuration name
- Gridly API key (encrypted)
- Gridly View ID
- Active status
- Creator reference

### Services

#### `gridly-api`
Core service for Gridly API interactions:
- `sendContentToGridly()`: Export content to Gridly
- `importTranslatedContent()`: Import translations from Gridly
- `testGridlyConnection()`: Test API connection
- `validateAndCreateMetadataColumns()`: Manage Gridly columns
- `validateAndCreateDependencies()`: Set up language dependencies
- `updateProjectProgress()`: Calculate and update progress

#### `project`
Manages project entities:
- CRUD operations for projects
- Project-subproject relationships

#### `subproject`
Manages subproject entities:
- CRUD operations for subprojects
- Progress tracking

#### `gridly-config`
Manages Gridly configurations:
- CRUD operations for configurations
- Secure API key storage

#### `i18n`
Integration with Strapi's i18n plugin:
- Locale management
- Localized entry retrieval

#### `background-sync`
Background synchronization service:
- Automatic content change detection
- Periodic sync (every 60 seconds)
- Silent error handling

### API Endpoints

All endpoints are prefixed with `/api/gridly-integration/`:

#### Projects
- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

#### Gridly Operations
- `POST /projects/:projectId/sync-to-gridly` - Sync content to Gridly
- `POST /projects/:projectId/import-from-gridly` - Import translations
- `POST /projects/:projectId/update-progress` - Update progress from Gridly
- `POST /projects/:projectId/send-to-gridly` - Send content to Gridly

#### Configurations
- `GET /gridly-configs` - List configurations
- `POST /gridly-configs` - Create configuration
- `PUT /gridly-configs/:id` - Update configuration
- `DELETE /gridly-configs/:id` - Delete configuration
- `GET /gridly-configs/:configId/test-connection` - Test connection

#### Validation
- `POST /gridly-configs/:configId/validate-columns` - Validate/create columns
- `POST /gridly-configs/:configId/validate-dependencies` - Validate/create dependencies

#### Content Types
- `GET /content-types` - List available content types
- `GET /content-types/:contentTypeUid/entries` - Get entries for content type

#### Utilities
- `GET /languages` - Get available languages
- `POST /cleanup-duplicate-entries` - Cleanup utility
- `POST /projects/update-configs` - Update existing projects with configs

## How It Works

### Content Export Flow

1. **Content Selection**: User selects content entries from Strapi
2. **Field Extraction**: Plugin extracts translatable fields from each entry
3. **Record Preparation**: Creates Gridly records with:
   - Source language content
   - Metadata (entry ID, content type, field name, etc.)
   - Field type information
4. **Column Validation**: Ensures required columns exist in Gridly
5. **Dependency Setup**: Creates language dependencies
6. **Batch Upload**: Sends records to Gridly in batches

### Content Import Flow

1. **Record Fetching**: Retrieves all records from Gridly view
2. **Grouping**: Groups records by Strapi entry and field
3. **Translation Extraction**: Extracts translated values for target languages
4. **Localization Creation**: Creates or updates localized entries in Strapi
5. **Linking**: Links translations to original entries using Strapi's localization system

### Progress Tracking

Progress is calculated based on Gridly's `dependencyStatus`:
- Records with `dependencyStatus === 'upToDate'` and non-empty values are counted as translated
- Progress is calculated per language and overall
- Updates can be triggered manually or automatically via background sync

### Background Sync

The background sync service:
- Runs every 60 seconds
- Compares Strapi content with Gridly records
- Detects changes by comparing content values and timestamps
- Only syncs changed content to minimize API calls
- Skips projects synced within the last 30 seconds

## Field Type Handling

The plugin intelligently handles different field types:

- **Text/String Fields**: Direct value mapping
- **Rich Text/Blocks**: Converts to Strapi's blocks format on import
- **JSON Fields**: Preserves JSON structure

Field types are detected from:
1. Strapi content type schema
2. Gridly metadata stored during export
3. Field name patterns (e.g., "Content" → richtext)

## Metadata Columns

The plugin creates these metadata columns in Gridly:

- `strapi_meta_id`: Original Strapi entry ID
- `strapi_meta_content_type`: Content type UID
- `strapi_meta_field_name`: Field name
- `strapi_meta_field_type`: Field type
- `strapi_meta_entry_title`: Human-readable entry title
- `strapi_meta_created_at`: Creation timestamp
- `strapi_meta_updated_at`: Last update timestamp
- `strapi_meta_base_locale`: Source locale code

These columns enable bidirectional sync and proper linking of translations.

## Error Handling

The plugin includes comprehensive error handling:

- **API Errors**: Extracts meaningful error messages from Gridly API responses
- **Validation Errors**: Validates configurations before syncing
- **Connection Errors**: Tests connections before operations
- **User Feedback**: Displays errors in the admin UI

## Development

### Project Structure

```
gridly-integration/
├── admin/              # Admin panel React components
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Admin pages
│   │   ├── contexts/   # React contexts
│   │   └── api/        # API client
│   └── ...
├── server/             # Server-side code
│   ├── bootstrap.js   # Plugin initialization
│   ├── controllers/   # API controllers
│   ├── services/      # Business logic services
│   ├── routes/        # API routes
│   └── content-types/ # Content type schemas
├── package.json
├── strapi-admin.js    # Admin entry point
└── strapi-server.js   # Server entry point
```

### Key Dependencies

- `axios`: HTTP client for Gridly API
- `@strapi/design-system`: Strapi UI components
- `@strapi/helper-plugin`: Strapi plugin utilities
- `react`, `react-dom`: React for admin UI

### Building

```bash
# Build admin panel
npm run build

# Development mode
npm run develop
```

### Testing

Test Gridly connections before syncing:
1. Create a Gridly configuration
2. Click **Test Connection**
3. Verify connection success

## Troubleshooting

### Common Issues

**Connection Errors**
- Verify Gridly API key is correct
- Check Gridly View ID exists
- Ensure API key has proper permissions

**Column Creation Failures**
- Verify Gridly API key has column creation permissions
- Check view ID is correct
- Review Gridly API error messages

**Import Issues**
- Ensure translations are marked as "upToDate" in Gridly
- Verify target language columns exist
- Check Strapi i18n plugin is enabled

**Progress Not Updating**
- Manually trigger progress update
- Verify Gridly records have correct dependencyStatus
- Check background sync is running

### Debug Mode

Enable debug logging by checking server console output. The plugin logs:
- 🚀 Operations starting
- ✅ Success messages
- ❌ Error messages
- 📋 Data processing steps
- 🔄 Sync operations

## License

MIT

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Gridly API documentation
3. Check Strapi plugin documentation

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns
- Error handling is comprehensive
- Logging is informative
- Tests are included where applicable
