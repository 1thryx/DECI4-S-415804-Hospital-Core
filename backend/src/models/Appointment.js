const mongoose = require('mongoose');

/**
 * Shared appointment shape. The canonical write-path for this collection lives in
 * services/appointment-service (see infra/docs/architecture.md); the core API keeps
 * this model so it can serve read-only dashboard aggregates without a network hop,
 * and so the stack still boots as a single service when the microservice is offline.
 */
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    scheduledFor: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 30, min: 5, max: 240 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
      index: true
    },
    notes: String,
    createdVia: { type: String, enum: ['core', 'appointment-service', 'seed'], default: 'core' }
  },
  { timestamps: true }
);

// Prevents double-booking the same clinician for the same slot.
appointmentSchema.index({ doctor: 1, scheduledFor: 1 }, { unique: true });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
