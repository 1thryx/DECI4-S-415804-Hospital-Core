const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Appointment booking is the platform's highest-traffic path, so it lives in its own
 * deployable: services/appointment-service. When APPOINTMENT_SERVICE_URL is set the
 * core API forwards writes there and the microservice owns the booking rules.
 *
 * If that URL is absent — single-container demos, the Vercel single-function deploy,
 * CI — the core falls back to the identical rules locally so the platform still boots
 * as a monolith. Same contract either way; only the topology changes.
 */
const SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL;
const PROXY_TIMEOUT_MS = Number(process.env.APPOINTMENT_SERVICE_TIMEOUT_MS || 5000);

async function proxy(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(`${SERVICE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-forwarded-by': 'hospital-core' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload };
  } finally {
    clearTimeout(timer);
  }
}

/** Booking rules, shared by the local fallback path. The microservice owns its own copy. */
async function validateBooking({ patient, doctor, scheduledFor }) {
  const [patientDoc, doctorDoc] = await Promise.all([Patient.findById(patient), Doctor.findById(doctor)]);
  if (!patientDoc) throw new ApiError(404, 'Patient not found');
  if (!doctorDoc) throw new ApiError(404, 'Doctor not found');
  if (!doctorDoc.active) throw new ApiError(409, 'Doctor is not currently accepting appointments');

  const when = new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) throw new ApiError(400, 'scheduledFor must be a valid date');

  const clash = await Appointment.findOne({
    doctor,
    scheduledFor: when,
    status: { $nin: ['cancelled', 'no-show'] }
  });
  if (clash) throw new ApiError(409, 'That slot is already booked for this doctor');

  return when;
}

// GET /api/appointments?status=&doctor=&patient=&from=&to=
exports.listAppointments = asyncHandler(async (req, res) => {
  const { status, doctor, patient, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
  if (patient) filter.patient = patient;
  if (from || to) {
    filter.scheduledFor = {};
    if (from) filter.scheduledFor.$gte = new Date(from);
    if (to) filter.scheduledFor.$lte = new Date(to);
  }

  const data = await Appointment.find(filter)
    .sort({ scheduledFor: 1 })
    .populate('patient', 'firstName lastName mrn phone')
    .populate('doctor', 'firstName lastName specialty roomNumber');

  res.json({ success: true, count: data.length, data });
});

// GET /api/appointments/:id
exports.getAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'firstName lastName mrn phone')
    .populate('doctor', 'firstName lastName specialty');
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  res.json({ success: true, data: appointment });
});

// POST /api/appointments
exports.createAppointment = asyncHandler(async (req, res) => {
  if (SERVICE_URL) {
    const { status, payload } = await proxy('POST', '/appointments', req.body);
    return res.status(status).json(payload);
  }

  const when = await validateBooking(req.body);
  const appointment = await Appointment.create({ ...req.body, scheduledFor: when, createdVia: 'core' });
  await appointment.populate([
    { path: 'patient', select: 'firstName lastName mrn' },
    { path: 'doctor', select: 'firstName lastName specialty' }
  ]);

  res.status(201).json({ success: true, data: appointment });
});

// PATCH /api/appointments/:id/status
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'];
  if (!allowed.includes(status)) throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);

  if (SERVICE_URL) {
    const result = await proxy('PATCH', `/appointments/${req.params.id}/status`, { status });
    return res.status(result.status).json(result.payload);
  }

  const appointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  res.json({ success: true, data: appointment });
});

// PUT /api/appointments/:id — reschedule
exports.rescheduleAppointment = asyncHandler(async (req, res) => {
  if (SERVICE_URL) {
    const result = await proxy('PUT', `/appointments/${req.params.id}`, req.body);
    return res.status(result.status).json(result.payload);
  }

  const existing = await Appointment.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Appointment not found');

  const when = await validateBooking({
    patient: req.body.patient || existing.patient,
    doctor: req.body.doctor || existing.doctor,
    scheduledFor: req.body.scheduledFor || existing.scheduledFor
  });

  Object.assign(existing, req.body, { scheduledFor: when });
  await existing.save();
  res.json({ success: true, data: existing });
});

// DELETE /api/appointments/:id — cancel
exports.cancelAppointment = asyncHandler(async (req, res) => {
  if (SERVICE_URL) {
    const result = await proxy('DELETE', `/appointments/${req.params.id}`);
    return res.status(result.status).json(result.payload);
  }

  const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  res.json({ success: true, data: appointment, message: 'Appointment cancelled' });
});
