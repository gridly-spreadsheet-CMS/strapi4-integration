'use strict';

module.exports = ({ strapi }) => {
  // bootstrap phase
  
  // Initialize background sync service
  console.log('🚀 Initializing Gridly Integration plugin...');
  
  // Start background sync service after a short delay to ensure Strapi is fully loaded
  setTimeout(() => {
    try {
      const backgroundSyncService = strapi.plugin('gridly-integration').service('backgroundSync');
      backgroundSyncService.init();
      console.log('✅ Background sync service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize background sync service:', error);
    }
  }, 5000); // Wait 5 seconds after bootstrap
};
