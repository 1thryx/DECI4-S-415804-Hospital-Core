const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const MedicalHistory = require('../models/MedicalHistory');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/stats/dashboard — powers the doctor dashboard tiles.
exports.dashboardStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  const [totalPatients, activePatients, totalDoctors, appointmentsToday, upcoming, byStatus, bySpecialty, recentActivity] =
    await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments({ status: 'active' }),
      Doctor.countDocuments({ active: true }),
      Appointment.countDocuments({ scheduledFor: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ scheduledFor: { $gt: new Date() }, status: 'scheduled' }),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doc' } },
        { $unwind: '$doc' },
        { $group: { _id: '$doc.specialty', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.find().sort({ createdAt: -1 }).limit(8)
    ]);

  res.json({
    success: true,
    data: {
      totalPatients,
      activePatients,
      totalDoctors,
      appointmentsToday,
      upcomingAppointments: upcoming,
      appointmentsByStatus: byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
      appointmentsBySpecialty: bySpecialty.map((r) => ({ specialty: r._id, count: r.count })),
      recentActivity,
      generatedAt: new Date().toISOString()
    }
  });
});

// GET /api/stats/patient-flow?days=7 — admissions trend for the dashboard chart.
exports.patientFlow = asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [registrations, appointments, records] = await Promise.all([
    Patient.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Appointment.aggregate([
      { $match: { scheduledFor: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledFor' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    MedicalHistory.countDocuments({ recordedAt: { $gte: since } })
  ]);

  res.json({ success: true, data: { days, registrations, appointments, recordsLogged: records } });
});
