'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('gridly-integration')
      .service('myService')
      .getWelcomeMessage();
  },
});
