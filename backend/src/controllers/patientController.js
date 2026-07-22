const Patient = require('../models/Patient');
const MedicalHistory = require('../models/MedicalHistory');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

// GET /api/patients?search=&status=&page=&limit=
exports.listPatients = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 25 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(search.trim(), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { mrn: rx }, { email: rx }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Patient.countDocuments(filter)
  ]);

  res.json({ success: true, count: data.length, total, page: Number(page), data });
});

// GET /api/patients/:id
exports.getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const [history, appointments] = await Promise.all([
    MedicalHistory.find({ patient: patient._id }).sort({ recordedAt: -1 }).populate('doctor', 'firstName lastName specialty'),
    Appointment.find({ patient: patient._id }).sort({ scheduledFor: -1 }).populate('doctor', 'firstName lastName specialty')
  ]);

  res.json({ success: true, data: { ...patient.toJSON(), history, appointments } });
});

// POST /api/patients
exports.createPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.create(req.body);
  res.status(201).json({ success: true, data: patient });
});

// PUT /api/patients/:id
exports.updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, data: patient });
});

// DELETE /api/patients/:id — soft delete; clinical records are never hard-deleted.
exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, data: patient, message: 'Patient archived' });
});

// POST /api/patients/:id/history
exports.addHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const record = await MedicalHistory.create({ ...req.body, patient: patient._id });
  res.status(201).json({ success: true, data: record });
});

// GET /api/patients/:id/history
exports.getHistory = asyncHandler(async (req, res) => {
  const history = await MedicalHistory.find({ patient: req.params.id })
    .sort({ recordedAt: -1 })
    .populate('doctor', 'firstName lastName specialty');
  res.json({ success: true, count: history.length, data: history });
});
