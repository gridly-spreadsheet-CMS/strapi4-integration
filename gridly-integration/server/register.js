'use strict';

module.exports = ({ strapi }) => {
  // register phase
  
  // Ensure the i18n plugin is available for our plugin
  // The i18n plugin is already installed in the main project
  // We just need to make sure it's properly registered
  if (!strapi.plugin('i18n')) {
    console.warn('i18n plugin is not available. Please ensure it is installed and enabled.');
  }
};
