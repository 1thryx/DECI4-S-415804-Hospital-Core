const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    specialty: {
      type: String,
      required: true,
      enum: ['Cardiology', 'Neurology', 'Paediatrics', 'Orthopaedics', 'General Medicine', 'Dermatology', 'Oncology']
    },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    roomNumber: String,
    // Weekly availability windows the scheduler validates bookings against.
    availability: {
      type: [
        {
          day: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
          start: String, // "09:00"
          end: String // "17:00"
        }
      ],
      default: []
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

doctorSchema.virtual('fullName').get(function () {
  return `Dr. ${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
