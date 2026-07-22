/**
 * Seeds the hospital database with realistic mock clinical data.
 *
 *   npm run seed              # wipe + reseed
 *   npm run seed -- --keep    # append without wiping
 *
 * Populates: doctors, patients, appointments, medical histories, audit logs.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./src/config/db');
const Patient = require('./src/models/Patient');
const Doctor = require('./src/models/Doctor');
const Appointment = require('./src/models/Appointment');
const MedicalHistory = require('./src/models/MedicalHistory');
const AuditLog = require('./src/models/AuditLog');

const WEEKDAYS = [
  { day: 'mon', start: '09:00', end: '17:00' },
  { day: 'tue', start: '09:00', end: '17:00' },
  { day: 'wed', start: '09:00', end: '13:00' },
  { day: 'thu', start: '09:00', end: '17:00' },
  { day: 'fri', start: '09:00', end: '15:00' }
];

const DOCTORS = [
  { firstName: 'Amina', lastName: 'Farouk', specialty: 'Cardiology', licenseNumber: 'LIC-CARD-1001', email: 'a.farouk@hospital.local', roomNumber: 'C-201' },
  { firstName: 'Youssef', lastName: 'Nabil', specialty: 'Neurology', licenseNumber: 'LIC-NEUR-1002', email: 'y.nabil@hospital.local', roomNumber: 'N-114' },
  { firstName: 'Sara', lastName: 'Mansour', specialty: 'Paediatrics', licenseNumber: 'LIC-PAED-1003', email: 's.mansour@hospital.local', roomNumber: 'P-006' },
  { firstName: 'Omar', lastName: 'Khalil', specialty: 'Orthopaedics', licenseNumber: 'LIC-ORTH-1004', email: 'o.khalil@hospital.local', roomNumber: 'O-303' },
  { firstName: 'Laila', lastName: 'Hassan', specialty: 'General Medicine', licenseNumber: 'LIC-GEN-1005', email: 'l.hassan@hospital.local', roomNumber: 'G-101' },
  { firstName: 'Karim', lastName: 'Adel', specialty: 'Dermatology', licenseNumber: 'LIC-DERM-1006', email: 'k.adel@hospital.local', roomNumber: 'D-208' }
];

const PATIENTS = [
  { firstName: 'Nadia', lastName: 'Ibrahim', dateOfBirth: '1985-03-14', gender: 'female', email: 'nadia.ibrahim@example.com', phone: '+20 100 111 2233', bloodType: 'A+', allergies: ['penicillin'] },
  { firstName: 'Tarek', lastName: 'Salem', dateOfBirth: '1972-11-02', gender: 'male', email: 'tarek.salem@example.com', phone: '+20 100 222 3344', bloodType: 'O-', allergies: [] },
  { firstName: 'Hana', lastName: 'Zaki', dateOfBirth: '1998-07-21', gender: 'female', email: 'hana.zaki@example.com', phone: '+20 100 333 4455', bloodType: 'B+', allergies: ['latex', 'sulfa'] },
  { firstName: 'Mostafa', lastName: 'Gamal', dateOfBirth: '1960-01-09', gender: 'male', email: 'mostafa.gamal@example.com', phone: '+20 100 444 5566', bloodType: 'AB+', allergies: ['aspirin'] },
  { firstName: 'Rana', lastName: 'Fouad', dateOfBirth: '2015-05-30', gender: 'female', email: 'rana.fouad@example.com', phone: '+20 100 555 6677', bloodType: 'O+', allergies: [] },
  { firstName: 'Ziad', lastName: 'Hafez', dateOfBirth: '1991-09-17', gender: 'male', email: 'ziad.hafez@example.com', phone: '+20 100 666 7788', bloodType: 'A-', allergies: ['iodine'] },
  { firstName: 'Mariam', lastName: 'Sobhy', dateOfBirth: '1978-12-25', gender: 'female', email: 'mariam.sobhy@example.com', phone: '+20 100 777 8899', bloodType: 'B-', allergies: [] },
  { firstName: 'Adel', lastName: 'Rashad', dateOfBirth: '2003-04-11', gender: 'male', email: 'adel.rashad@example.com', phone: '+20 100 888 9900', bloodType: 'O+', allergies: ['peanuts'] },
  { firstName: 'Salma', lastName: 'Wagdy', dateOfBirth: '1966-08-08', gender: 'female', email: 'salma.wagdy@example.com', phone: '+20 100 999 0011', bloodType: 'A+', allergies: [] },
  { firstName: 'Hossam', lastName: 'Nour', dateOfBirth: '1989-02-19', gender: 'male', email: 'hossam.nour@example.com', phone: '+20 101 111 2222', bloodType: 'AB-', allergies: ['codeine'] },
  { firstName: 'Dina', lastName: 'Ramzy', dateOfBirth: '1995-06-06', gender: 'female', email: 'dina.ramzy@example.com', phone: '+20 101 222 3333', bloodType: 'O+', allergies: [] },
  { firstName: 'Sherif', lastName: 'Lotfy', dateOfBirth: '1955-10-30', gender: 'male', email: 'sherif.lotfy@example.com', phone: '+20 101 333 4444', bloodType: 'B+', allergies: ['contrast dye'] }
];

const HISTORY_TEMPLATES = [
  { type: 'diagnosis', title: 'Essential hypertension', icd10Code: 'I10', description: 'BP consistently above 140/90 across three readings. Started on lifestyle modification.' },
  { type: 'prescription', title: 'Amlodipine 5mg once daily', description: 'Dispensed 30 tablets. Review in 4 weeks.' },
  { type: 'lab-result', title: 'Full blood count', description: 'Hb 13.2 g/dL, WBC 7.1, platelets 250. Within normal range.' },
  { type: 'procedure', title: 'ECG — 12 lead', description: 'Sinus rhythm, rate 74 bpm. No ST changes.' },
  { type: 'note', title: 'Follow-up consultation', description: 'Patient reports improved exercise tolerance. Continue current regimen.' },
  { type: 'diagnosis', title: 'Type 2 diabetes mellitus', icd10Code: 'E11', description: 'HbA1c 7.8%. Commenced metformin.' },
  { type: 'lab-result', title: 'Lipid panel', description: 'LDL 3.4 mmol/L, HDL 1.2, triglycerides 1.8.' },
  { type: 'prescription', title: 'Metformin 500mg twice daily', description: 'Titrate as tolerated. Monitor renal function.' }
];

const REASONS = [
  'Routine check-up',
  'Chest pain evaluation',
  'Post-operative follow-up',
  'Paediatric vaccination',
  'Chronic migraine review',
  'Blood pressure monitoring',
  'Skin lesion assessment',
  'Knee pain — suspected meniscus tear',
  'Diabetes management review',
  'Annual physical examination'
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Slot at 09:00 + n*30min on a given day offset — keeps the unique doctor/time index happy. */
function slot(dayOffset, index) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(9 + Math.floor(index / 2), (index % 2) * 30, 0, 0);
  return d;
}

async function seed() {
  const keep = process.argv.includes('--keep');
  await connectDB();

  if (!keep) {
    console.log('[seed] Clearing existing collections...');
    await Promise.all([
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Appointment.deleteMany({}),
      MedicalHistory.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
  }

  console.log('[seed] Inserting doctors...');
  const doctors = await Doctor.insertMany(DOCTORS.map((d) => ({ ...d, availability: WEEKDAYS, active: true })));

  console.log('[seed] Inserting patients...');
  const patients = await Patient.create(
    PATIENTS.map((p) => ({
      ...p,
      address: { line1: `${Math.floor(Math.random() * 200) + 1} Nile Street`, city: 'Cairo', country: 'Egypt', postcode: '11511' }
    }))
  );

  console.log('[seed] Booking appointments...');
  const appointments = [];
  let slotCursor = 0;

  for (const doctor of doctors) {
    // Each doctor gets a past, a today, and two future appointments.
    for (const dayOffset of [-7, -2, 0, 3]) {
      const when = slot(dayOffset, slotCursor % 12);
      slotCursor += 1;
      appointments.push({
        patient: pick(patients)._id,
        doctor: doctor._id,
        scheduledFor: when,
        durationMinutes: 30,
        reason: pick(REASONS),
        status: dayOffset < 0 ? pick(['completed', 'completed', 'no-show']) : 'scheduled',
        createdVia: 'seed'
      });
    }
  }
  const createdAppointments = await Appointment.insertMany(appointments, { ordered: false });

  console.log('[seed] Writing medical histories...');
  const histories = [];
  for (const patient of patients) {
    const count = Math.floor(Math.random() * 3) + 2; // 2–4 records each
    for (let i = 0; i < count; i += 1) {
      const template = pick(HISTORY_TEMPLATES);
      const recordedAt = new Date(Date.now() - Math.floor(Math.random() * 240) * 24 * 60 * 60 * 1000);
      histories.push({ ...template, patient: patient._id, doctor: pick(doctors)._id, recordedAt });
    }
  }
  const createdHistories = await MedicalHistory.insertMany(histories);

  console.log('[seed] Writing audit log entries...');
  const logs = await AuditLog.insertMany(
    createdAppointments.slice(0, 10).map((appt) => ({
      action: 'POST /api/appointments',
      entity: 'Appointment',
      entityId: String(appt._id),
      actor: 'seed-script',
      statusCode: 201,
      ip: '127.0.0.1',
      meta: { source: 'seed' }
    }))
  );

  console.log('\n[seed] Done:');
  console.table({
    doctors: doctors.length,
    patients: patients.length,
    appointments: createdAppointments.length,
    medicalHistories: createdHistories.length,
    auditLogs: logs.length
  });

  await disconnectDB();
  return { doctors, patients, appointments: createdAppointments };
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('[seed] Failed:', err);
      await mongoose.connection.close().catch(() => {});
      process.exit(1);
    });
}

module.exports = { seed, DOCTORS, PATIENTS };
