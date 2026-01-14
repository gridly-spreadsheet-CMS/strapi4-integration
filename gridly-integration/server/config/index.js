'use strict';

module.exports = {
  default: {
    logLevel: process.env.GRIDLY_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
  validator(config) {
    if (config.logLevel && !['error', 'warn', 'info', 'debug'].includes(config.logLevel)) {
      throw new Error('logLevel must be one of: error, warn, info, debug');
    }
  },
};
