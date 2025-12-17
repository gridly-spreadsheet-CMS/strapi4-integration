'use strict';

module.exports = ({ strapi }) => ({
  async find(query) {
    return await strapi.entityService.findMany('plugin::gridly-integration.gridly-project', {
      ...query,
      populate: ['subprojects', 'gridly-config-id']
    });
  },
  async findOne(id) {
    return await strapi.entityService.findOne('plugin::gridly-integration.gridly-project', id, {
      populate: ['subprojects', 'gridly-config-id']
    });
  },
    async create(data) {
    return await strapi.entityService.create('plugin::gridly-integration.gridly-project', data);
  },
  async delete(id) {
    return await strapi.entityService.delete('plugin::gridly-integration.gridly-project', id);
  },
  async update(id, data) {
    return await strapi.entityService.update('plugin::gridly-integration.gridly-project', id, data);
  },
});
