'use strict';

module.exports = ({ strapi }) => ({
  async find(query) {
    return await strapi.entityService.findMany('plugin::gridly-integration.gridly-subproject', {
      ...query,
      populate: ['project']
    });
  },
  async findOne(id) {
    return await strapi.entityService.findOne('plugin::gridly-integration.gridly-subproject', id, {
      populate: ['project']
    });
  },
  async create(data) {
    return await strapi.entityService.create('plugin::gridly-integration.gridly-subproject', data);
  },
  async update(id, data) {
    return await strapi.entityService.update('plugin::gridly-integration.gridly-subproject', id, data);
  },
  async delete(id) {
    return await strapi.entityService.delete('plugin::gridly-integration.gridly-subproject', id);
  },
}); 