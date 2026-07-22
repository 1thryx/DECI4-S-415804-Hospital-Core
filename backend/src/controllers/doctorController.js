const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

// GET /api/doctors
exports.listDoctors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.specialty) filter.specialty = req.query.specialty;
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';

  const data = await Doctor.find(filter).sort({ lastName: 1 });
  res.json({ success: true, count: data.length, data });
});

// GET /api/doctors/:id
exports.getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  res.json({ success: true, data: doctor });
});

// POST /api/doctors
exports.createDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.create(req.body);
  res.status(201).json({ success: true, data: doctor });
});

// PUT /api/doctors/:id
exports.updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  res.json({ success: true, data: doctor });
});

// GET /api/doctors/:id/schedule?date=YYYY-MM-DD
exports.getSchedule = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new ApiError(404, 'Doctor not found');

  const day = req.query.date ? new Date(req.query.date) : new Date();
  const start = new Date(day.setHours(0, 0, 0, 0));
  const end = new Date(day.setHours(23, 59, 59, 999));

  const appointments = await Appointment.find({
    doctor: doctor._id,
    scheduledFor: { $gte: start, $lte: end },
    status: { $ne: 'cancelled' }
  })
    .sort({ scheduledFor: 1 })
    .populate('patient', 'firstName lastName mrn');

  res.json({ success: true, count: appointments.length, data: appointments });
});
