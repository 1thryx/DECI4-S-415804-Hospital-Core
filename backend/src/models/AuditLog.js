const mongoose = require('mongoose');

/**
 * Clinical systems need a tamper-evident trail of who touched what. Written by the
 * audit middleware on every mutating request.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // e.g. "POST /api/patients"
    entity: { type: String, required: true }, // "Patient" | "Appointment" | ...
    entityId: String,
    actor: { type: String, default: 'system' },
    statusCode: Number,
    ip: String,
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
