'use strict';

module.exports = ({ strapi }) => {
  // Get logger service
  const logger = strapi.plugin('gridly-integration').service('logger');

  return {
    /**
     * Get all available locales
     */
    async getLocales() {
      try {
        const locales = await strapi.entityService.findMany('plugin::i18n.locale', {
          fields: ['id', 'code', 'name'],
          sort: { name: 'asc' }
        });
        
        return locales;
      } catch (error) {
        logger.error('Failed to fetch locales from Strapi i18n plugin:', error.message);
        logger.debug('Error details:', error.stack);
        // Return empty array for graceful degradation - callers can handle empty locale list
        return [];
      }
    },

    /**
     * Get the default locale
     */
    getDefaultLocale() {
      return strapi.config.get('plugin.i18n.defaultLocale', 'en');
    },

    /**
     * Get all configured locales with additional info
     */
    async getLocalesWithInfo() {
      try {
        const locales = await this.getLocales();
        const defaultLocale = this.getDefaultLocale();
        
        return locales.map(locale => ({
          id: locale.id,
          code: locale.code,
          name: locale.name,
          isDefault: locale.code === defaultLocale
        }));
      } catch (error) {
        logger.error('Failed to get locales with info:', error.message);
        logger.debug('Error details:', error.stack);
        // Return empty array for graceful degradation
        return [];
      }
    },

    /**
     * Check if i18n plugin is available
     */
    isI18nAvailable() {
      return !!strapi.plugin('i18n');
    },

    /**
     * Get localized entries for a content type
     */
    async getLocalizedEntries(contentTypeUid, locale = null) {
      try {
        if (!this.isI18nAvailable()) {
          throw new Error('i18n plugin is not available');
        }

        const query = {
          sort: { createdAt: 'desc' },
          populate: {} // No relations for performance
        };

        // Add locale filter if specified
        if (locale) {
          query.filters = {
            locale: locale
          };
        }

        const entries = await strapi.entityService.findMany(contentTypeUid, query);
        
        return entries;
      } catch (error) {
        logger.error(`Failed to get localized entries for content type ${contentTypeUid}${locale ? ` (locale: ${locale})` : ''}:`, error.message);
        logger.debug('Error details:', error.stack);
        // Return empty array for graceful degradation
        return [];
      }
    }
  };
}; 