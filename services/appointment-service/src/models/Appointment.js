const mongoose = require('mongoose');

/**
 * This service owns the appointments collection. The schema is deliberately duplicated
 * rather than imported from ../../backend — the two services deploy, version and scale
 * independently, so a shared filesystem import would recouple them.
 */
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
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
    createdVia: { type: String, default: 'appointment-service' }
  },
  { timestamps: true, collection: 'appointments' }
);

appointmentSchema.index({ doctor: 1, scheduledFor: 1 }, { unique: true });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
