module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: 'myController.index',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/projects',
    handler: 'project.find',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'GET',
    path: '/find',
    handler: 'project.find',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'GET',
    path: '/projects/:id',
    handler: 'project.findOne',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'POST',
    path: '/projects',
    handler: 'project.create',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'DELETE',
    path: '/projects/:id',
    handler: 'project.delete',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'PUT',
    path: '/projects/:id',
    handler: 'project.update',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'POST',
    path: '/projects/update-configs',
    handler: 'project.updateExistingProjectsWithConfig',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'GET',
    path: '/languages',
    handler: 'project.getLanguages',
    config: {
      policies: [],
      auth: false
    },
  },
  {
    method: 'GET',
    path: '/gridly-configs',
    handler: 'project.getGridlyConfigs',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/gridly-configs',
    handler: 'project.createGridlyConfig',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'PUT',
    path: '/gridly-configs/:id',
    handler: 'project.updateGridlyConfig',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'DELETE',
    path: '/gridly-configs/:id',
    handler: 'project.deleteGridlyConfig',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'GET',
    path: '/content-types',
    handler: 'project.getContentTypes',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'GET',
    path: '/content-types/:contentTypeUid/entries',
    handler: 'project.getContentTypeEntries',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/projects/:projectId/send-to-gridly',
    handler: 'project.sendContentToGridly',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/projects/:projectId/sync-to-gridly',
    handler: 'project.syncToGridly',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/projects/:projectId/import-from-gridly',
    handler: 'project.importFromGridly',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/projects/:projectId/update-progress',
    handler: 'project.updateProgressFromGridly',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'GET',
    path: '/gridly-configs/:configId/test-connection',
    handler: 'project.testGridlyConnection',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/gridly-configs/:configId/validate-columns',
    handler: 'project.validateGridlyColumns',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/gridly-configs/:configId/validate-dependencies',
    handler: 'project.validateGridlyDependencies',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
  {
    method: 'POST',
    path: '/cleanup-duplicate-entries',
    handler: 'project.cleanupDuplicateEntries',
    config: {
      policies: [],
      auth: {
        scope: ['admin::is-authenticated']
      }
    },
  },
];
