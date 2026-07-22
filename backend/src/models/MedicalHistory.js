const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    recordedAt: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['diagnosis', 'prescription', 'lab-result', 'procedure', 'note'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    description: String,
    icd10Code: String,
    attachments: { type: [String], default: [] }
  },
  { timestamps: true }
);

medicalHistorySchema.index({ patient: 1, recordedAt: -1 });

module.exports = mongoose.models.MedicalHistory || mongoose.model('MedicalHistory', medicalHistorySchema);
