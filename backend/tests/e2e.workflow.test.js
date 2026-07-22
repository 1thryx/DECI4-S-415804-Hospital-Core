/**
 * END-TO-END CLINICAL WORKFLOW
 *
 * Walks the exact journey a receptionist and clinician perform on day one, through
 * the real HTTP surface with no mocking below the transport:
 *
 *   1. Register a doctor onto the roster
 *   2. Onboard a new patient at the front desk
 *   3. Book that patient into an appointment slot
 *   4. Confirm the doctor's dashboard stats move
 *   5. Check the patient in, then complete the consultation
 *   6. File a diagnosis + prescription against the patient's history
 *   7. Confirm the patient record reflects the whole visit
 */
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

describe('E2E: patient onboarding → appointment booking → dashboard update', () => {
  it('completes a full clinical visit and reflects it in dashboard statistics', async () => {
    // ---- Baseline: an empty hospital -------------------------------------
    const baseline = await request(app).get('/api/stats/dashboard').expect(200);
    expect(baseline.body.data.totalPatients).toBe(0);
    expect(baseline.body.data.appointmentsToday).toBe(0);

    // ---- Step 1: register the attending clinician ------------------------
    const doctorRes = await request(app)
      .post('/api/doctors')
      .send({
        firstName: 'Laila',
        lastName: 'Hassan',
        specialty: 'General Medicine',
        licenseNumber: 'LIC-GEN-9001',
        email: 'l.hassan@hospital.local',
        roomNumber: 'G-101'
      })
      .expect(201);

    const doctorId = doctorRes.body.data._id;
    expect(doctorRes.body.data.fullName).toBe('Dr. Laila Hassan');

    // ---- Step 2: onboard the patient at reception ------------------------
    const patientRes = await request(app)
      .post('/api/patients')
      .send({
        firstName: 'Ziad',
        lastName: 'Hafez',
        dateOfBirth: '1991-09-17',
        gender: 'male',
        email: 'ziad.hafez@example.com',
        phone: '+20 100 666 7788',
        bloodType: 'A-',
        allergies: ['iodine']
      })
      .expect(201);

    const patientId = patientRes.body.data._id;
    const mrn = patientRes.body.data.mrn;
    expect(mrn).toMatch(/^MRN-/);

    // The registration must be immediately visible to the front desk search.
    const searchRes = await request(app).get('/api/patients?search=Hafez').expect(200);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].mrn).toBe(mrn);

    // ---- Step 3: book the appointment ------------------------------------
    const slot = new Date();
    slot.setHours(slot.getHours() + 2, 0, 0, 0); // later today, so it hits "today" counters

    const bookingRes = await request(app)
      .post('/api/appointments')
      .send({
        patient: patientId,
        doctor: doctorId,
        scheduledFor: slot.toISOString(),
        durationMinutes: 30,
        reason: 'New patient intake and blood pressure review'
      })
      .expect(201);

    const appointmentId = bookingRes.body.data._id;
    expect(bookingRes.body.data.status).toBe('scheduled');

    // ---- Step 4: the dashboard must reflect the new activity -------------
    const afterBooking = await request(app).get('/api/stats/dashboard').expect(200);
    const stats = afterBooking.body.data;

    expect(stats.totalPatients).toBe(1);
    expect(stats.activePatients).toBe(1);
    expect(stats.totalDoctors).toBe(1);
    expect(stats.appointmentsToday).toBe(1);
    expect(stats.appointmentsByStatus.scheduled).toBe(1);
    expect(stats.appointmentsBySpecialty).toEqual([{ specialty: 'General Medicine', count: 1 }]);

    // The clinician's day view must show the booking.
    const scheduleRes = await request(app).get(`/api/doctors/${doctorId}/schedule`).expect(200);
    expect(scheduleRes.body.count).toBe(1);
    expect(scheduleRes.body.data[0].patient.mrn).toBe(mrn);

    // ---- Step 5: check in, then complete the consultation -----------------
    await request(app).patch(`/api/appointments/${appointmentId}/status`).send({ status: 'checked-in' }).expect(200);

    const checkedIn = await request(app).get('/api/stats/dashboard').expect(200);
    expect(checkedIn.body.data.appointmentsByStatus['checked-in']).toBe(1);
    expect(checkedIn.body.data.appointmentsByStatus.scheduled).toBeUndefined();

    await request(app).patch(`/api/appointments/${appointmentId}/status`).send({ status: 'completed' }).expect(200);

    // ---- Step 6: file the clinical outcome -------------------------------
    await request(app)
      .post(`/api/patients/${patientId}/history`)
      .send({
        type: 'diagnosis',
        title: 'Essential hypertension',
        icd10Code: 'I10',
        description: 'BP 148/94 on repeat measurement. Commence lifestyle modification.',
        doctor: doctorId
      })
      .expect(201);

    await request(app)
      .post(`/api/patients/${patientId}/history`)
      .send({
        type: 'prescription',
        title: 'Amlodipine 5mg once daily',
        description: '30 tablets dispensed. Review in 4 weeks.',
        doctor: doctorId
      })
      .expect(201);

    // ---- Step 7: the patient record tells the whole story ----------------
    const finalPatient = await request(app).get(`/api/patients/${patientId}`).expect(200);
    const record = finalPatient.body.data;

    expect(record.fullName).toBe('Ziad Hafez');
    expect(record.history).toHaveLength(2);
    expect(record.history.map((h) => h.type).sort()).toEqual(['diagnosis', 'prescription']);
    expect(record.history[0].doctor.lastName).toBe('Hassan');
    expect(record.appointments).toHaveLength(1);
    expect(record.appointments[0].status).toBe('completed');

    const finalStats = await request(app).get('/api/stats/dashboard').expect(200);
    expect(finalStats.body.data.appointmentsByStatus.completed).toBe(1);
    expect(finalStats.body.data.upcomingAppointments).toBe(0);
  });

  it('blocks the second patient from taking an already-booked slot', async () => {
    const doctor = await request(app).post('/api/doctors').send({
      firstName: 'Omar',
      lastName: 'Khalil',
      specialty: 'Orthopaedics',
      licenseNumber: 'LIC-ORTH-9002',
      email: 'o.khalil@hospital.local'
    });

    const makePatient = (n) =>
      request(app).post('/api/patients').send({
        firstName: `Patient${n}`,
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        email: `patient${n}@example.com`,
        phone: `+20 100 000 000${n}`
      });

    const [p1, p2] = await Promise.all([makePatient(1), makePatient(2)]);
    const slot = new Date(Date.now() + 3 * 3600 * 1000).toISOString();

    await request(app)
      .post('/api/appointments')
      .send({ patient: p1.body.data._id, doctor: doctor.body.data._id, scheduledFor: slot, reason: 'Knee pain' })
      .expect(201);

    await request(app)
      .post('/api/appointments')
      .send({ patient: p2.body.data._id, doctor: doctor.body.data._id, scheduledFor: slot, reason: 'Shoulder pain' })
      .expect(409);

    const stats = await request(app).get('/api/stats/dashboard').expect(200);
    expect(stats.body.data.totalPatients).toBe(2);
    expect(stats.body.data.appointmentsByStatus.scheduled).toBe(1);
  });
});
