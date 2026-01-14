'use strict';

/**
 * Logger utility for Gridly Integration plugin
 * Uses Strapi's built-in logging with configurable verbosity levels
 */
module.exports = ({ strapi }) => {
  // Log levels: 'error', 'warn', 'info', 'debug'
  // Default to 'info' in production, 'debug' in development
  const getLogLevel = () => {
    // Check environment variable first
    const envLogLevel = process.env.GRIDLY_LOG_LEVEL;
    if (envLogLevel && ['error', 'warn', 'info', 'debug'].includes(envLogLevel.toLowerCase())) {
      return envLogLevel.toLowerCase();
    }
    
    // Check plugin config
    const pluginConfig = strapi.config.get('plugin.gridly-integration');
    if (pluginConfig && pluginConfig.logLevel) {
      return pluginConfig.logLevel.toLowerCase();
    }
    
    // Default based on environment
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  };

  const logLevel = getLogLevel();
  
  // Define log level hierarchy (higher number = more verbose)
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  const shouldLog = (level) => {
    return levels[level] <= levels[logLevel];
  };

  // Helper to format log messages
  const formatMessage = (...args) => {
    if (args.length === 0) return '';
    if (args.length === 1) {
      const arg = args[0];
      if (typeof arg === 'string') {
        return `[Gridly Integration] ${arg}`;
      }
      return `[Gridly Integration] ${JSON.stringify(arg)}`;
    }
    // Multiple arguments - format them
    const formatted = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
      return String(arg);
    }).join(' ');
    return `[Gridly Integration] ${formatted}`;
  };

  return {
    /**
     * Log error messages
     */
    error(...args) {
      if (shouldLog('error')) {
        strapi.log.error(formatMessage(...args));
      }
    },

    /**
     * Log warning messages
     */
    warn(...args) {
      if (shouldLog('warn')) {
        strapi.log.warn(formatMessage(...args));
      }
    },

    /**
     * Log informational messages
     */
    info(...args) {
      if (shouldLog('info')) {
        strapi.log.info(formatMessage(...args));
      }
    },

    /**
     * Log debug messages (most verbose)
     */
    debug(...args) {
      if (shouldLog('debug')) {
        strapi.log.debug(formatMessage(...args));
      }
    },

    /**
     * Get current log level
     */
    getLogLevel() {
      return logLevel;
    },
  };
};

