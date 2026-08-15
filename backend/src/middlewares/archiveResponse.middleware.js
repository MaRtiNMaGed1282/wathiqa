'use strict';

const { isArchived } = require('../services/archive.service');

const ENTITY_BY_PREFIX = [
  { prefix: '/api/clients', type: 'client', idKey: 'id' },
  { prefix: '/api/cases', type: 'case', idKey: 'case_id' },
  { prefix: '/api/services', type: 'service', idKey: 'service_id' },
];

function getContext(url = '') {
  return ENTITY_BY_PREFIX.find(({ prefix }) => url === prefix || url.startsWith(`${prefix}/`));
}

function getPathId(url = '') {
  const match = url.split('?')[0].match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

module.exports = function archiveResponseMiddleware(req, res, next) {
  const context = getContext(req.path);
  if (!context || req.method !== 'GET') return next();

  const originalJson = res.json.bind(res);

  res.json = async function archiveAwareJson(payload) {
    try {
      if (Array.isArray(payload)) {
        const filtered = [];
        for (const item of payload) {
          const id = item?.[context.idKey] ?? item?.id;
          if (id == null || !(await isArchived(context.type, Number(id)))) filtered.push(item);
        }
        return originalJson(filtered);
      }

      const id = getPathId(req.path);
      if (id && payload && typeof payload === 'object' && !(await isArchived(context.type, id))) {
        return originalJson(payload);
      }

      if (id && payload && typeof payload === 'object' && await isArchived(context.type, id)) {
        return originalJson({ message: 'السجل غير موجود' });
      }

      return originalJson(payload);
    } catch (error) {
      return originalJson(payload);
    }
  };

  next();
};
