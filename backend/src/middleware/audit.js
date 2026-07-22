const AuditLog = require('../models/AuditLog');

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Records every mutating request once the response is on the wire, so auditing
 * never adds latency to the clinical request path and never fails a request.
 */
function audit(entity) {
  return function auditMiddleware(req, res, next) {
    if (!MUTATING.has(req.method)) return next();

    res.on('finish', () => {
      AuditLog.create({
        action: `${req.method} ${req.baseUrl}${req.path}`,
        entity,
        entityId: req.params.id,
        actor: req.header('x-user-id') || 'anonymous',
        statusCode: res.statusCode,
        ip: req.ip,
        meta: { query: req.query }
      }).catch((err) => console.warn('[audit] write failed:', err.message));
    });

    next();
  };
}

module.exports = { audit };
