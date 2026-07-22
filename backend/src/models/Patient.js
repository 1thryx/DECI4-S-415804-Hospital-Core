const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    mrn: {
      type: String,
      unique: true,
      index: true
      // Medical Record Number — generated in pre-validate below when omitted.
    },
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    dateOfBirth: { type: Date, required: [true, 'Date of birth is required'] },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'], default: 'unknown' },
    allergies: { type: [String], default: [] },
    address: {
      line1: String,
      city: String,
      country: String,
      postcode: String
    },
    status: { type: String, enum: ['active', 'discharged', 'inactive'], default: 'active' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

patientSchema.pre('validate', function (next) {
  if (!this.mrn) {
    this.mrn = `MRN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  next();
});

patientSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
