'use strict';

module.exports = ({ strapi }) => ({
  async find(query) {
    return await strapi.entityService.findMany('plugin::gridly-integration.gridly-config', {
      ...query,
      populate: {
        created_by: {
          fields: ['id', 'firstname', 'lastname', 'username', 'email']
        }
      },
      fields: ['id', 'name', 'gridly-api-key', 'gridly-view-id', 'description', 'is-active', 'created_at', 'updated_at']
    });
  },
  async findOne(id) {
    return await strapi.entityService.findOne('plugin::gridly-integration.gridly-config', id, {
      populate: {
        created_by: {
          fields: ['id', 'firstname', 'lastname', 'username', 'email']
        }
      },
      fields: ['id', 'name', 'gridly-api-key', 'gridly-view-id', 'description', 'is-active', 'created_at', 'updated_at']
    });
  },
  async create(data) {
    return await strapi.entityService.create('plugin::gridly-integration.gridly-config', { data });
  },
  async update(id, data) {
    return await strapi.entityService.update('plugin::gridly-integration.gridly-config', id, { data });
  },
  async delete(id) {
    return await strapi.entityService.delete('plugin::gridly-integration.gridly-config', id);
  },
}); 