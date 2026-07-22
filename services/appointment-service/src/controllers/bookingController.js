const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Cross-aggregate validation. The service does not own patients or doctors, so it asks
 * the core API whether the referenced records exist rather than reaching into their
 * collections directly. If the core is unreachable the booking is rejected rather than
 * written optimistically — a phantom appointment is worse than a retry.
 */
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000/api';

async function assertReferencesExist(patientId, doctorId) {
  if (!mongoose.isValidObjectId(patientId)) {
    const err = new Error('patient must be a valid id');
    err.statusCode = 400;
    throw err;
  }
  if (!mongoose.isValidObjectId(doctorId)) {
    const err = new Error('doctor must be a valid id');
    err.statusCode = 400;
    throw err;
  }

  if (process.env.SKIP_CORE_VALIDATION === 'true') return;

  const [patientRes, doctorRes] = await Promise.all([
    fetch(`${CORE_API_URL}/patients/${patientId}`).catch(() => null),
    fetch(`${CORE_API_URL}/doctors/${doctorId}`).catch(() => null)
  ]);

  if (!patientRes || !doctorRes) {
    const err = new Error('Core API unreachable — booking rejected');
    err.statusCode = 503;
    throw err;
  }
  if (patientRes.status === 404) {
    const err = new Error('Patient not found');
    err.statusCode = 404;
    throw err;
  }
  if (doctorRes.status === 404) {
    const err = new Error('Doctor not found');
    err.statusCode = 404;
    throw err;
  }
}

// GET /appointments
exports.list = asyncHandler(async (req, res) => {
  const { doctor, patient, status, from, to } = req.query;
  const filter = {};
  if (doctor) filter.doctor = doctor;
  if (patient) filter.patient = patient;
  if (status) filter.status = status;
  if (from || to) {
    filter.scheduledFor = {};
    if (from) filter.scheduledFor.$gte = new Date(from);
    if (to) filter.scheduledFor.$lte = new Date(to);
  }

  const data = await Appointment.find(filter).sort({ scheduledFor: 1 });
  res.json({ success: true, count: data.length, data });
});

// GET /appointments/:id
exports.get = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
  res.json({ success: true, data: appointment });
});

// POST /appointments
exports.book = asyncHandler(async (req, res) => {
  const { patient, doctor, scheduledFor, reason, durationMinutes, notes } = req.body;

  const missing = ['patient', 'doctor', 'scheduledFor', 'reason'].filter((f) => !req.body[f]);
  if (missing.length) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: missing.map((field) => ({ field, message: `${field} is required` }))
    });
  }

  const when = new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) {
    return res.status(400).json({ success: false, error: 'scheduledFor must be a valid date' });
  }

  await assertReferencesExist(patient, doctor);

  const clash = await Appointment.findOne({
    doctor,
    scheduledFor: when,
    status: { $nin: ['cancelled', 'no-show'] }
  });
  if (clash) {
    return res.status(409).json({ success: false, error: 'That slot is already booked for this doctor' });
  }

  const appointment = await Appointment.create({
    patient,
    doctor,
    scheduledFor: when,
    reason,
    durationMinutes,
    notes,
    createdVia: 'appointment-service'
  });

  res.status(201).json({ success: true, data: appointment });
});

// PUT /appointments/:id — reschedule
exports.reschedule = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });

  if (req.body.scheduledFor) {
    const when = new Date(req.body.scheduledFor);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, error: 'scheduledFor must be a valid date' });
    }
    const clash = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: req.body.doctor || appointment.doctor,
      scheduledFor: when,
      status: { $nin: ['cancelled', 'no-show'] }
    });
    if (clash) return res.status(409).json({ success: false, error: 'That slot is already booked for this doctor' });
    appointment.scheduledFor = when;
  }

  ['reason', 'durationMinutes', 'notes', 'doctor'].forEach((field) => {
    if (req.body[field] !== undefined) appointment[field] = req.body[field];
  });

  await appointment.save();
  res.json({ success: true, data: appointment });
});

// PATCH /appointments/:id/status
exports.updateStatus = asyncHandler(async (req, res) => {
  const allowed = ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ success: false, error: `status must be one of: ${allowed.join(', ')}` });
  }

  const appointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
  res.json({ success: true, data: appointment });
});

// DELETE /appointments/:id — cancel
exports.cancel = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
  if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
  res.json({ success: true, data: appointment, message: 'Appointment cancelled' });
});
