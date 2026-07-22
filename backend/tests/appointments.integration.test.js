const request = require('supertest');
const { createApp } = require('../src/app');
const Patient = require('../src/models/Patient');
const Doctor = require('../src/models/Doctor');

const app = createApp();

async function fixtures() {
  const patient = await Patient.create({
    firstName: 'Hana',
    lastName: 'Zaki',
    dateOfBirth: '1998-07-21',
    email: 'hana.zaki@example.com',
    phone: '+20 100 333 4455'
  });
  const doctor = await Doctor.create({
    firstName: 'Amina',
    lastName: 'Farouk',
    specialty: 'Cardiology',
    licenseNumber: 'LIC-CARD-1001',
    email: 'a.farouk@hospital.local'
  });
  return { patient, doctor };
}

const futureSlot = (hoursAhead = 24) => new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();

describe('Appointments API', () => {
  it('books an appointment against a valid patient and doctor', async () => {
    const { patient, doctor } = await fixtures();

    const res = await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: futureSlot(), reason: 'Chest pain evaluation' })
      .expect(201);

    expect(res.body.data.status).toBe('scheduled');
    expect(res.body.data.patient.firstName).toBe('Hana');
    expect(res.body.data.doctor.specialty).toBe('Cardiology');
  });

  it('refuses to double-book the same clinician for the same slot', async () => {
    const { patient, doctor } = await fixtures();
    const when = futureSlot(48);

    await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: when, reason: 'First booking' })
      .expect(201);

    const res = await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: when, reason: 'Clashing booking' })
      .expect(409);

    expect(res.body.error).toMatch(/already booked/i);
  });

  it('rejects a booking for a doctor who is not accepting patients', async () => {
    const { patient, doctor } = await fixtures();
    await Doctor.findByIdAndUpdate(doctor._id, { active: false });

    const res = await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: futureSlot(), reason: 'Review' })
      .expect(409);

    expect(res.body.error).toMatch(/not currently accepting/i);
  });

  it('404s when the referenced patient does not exist', async () => {
    const { doctor } = await fixtures();
    await request(app)
      .post('/api/appointments')
      .send({ patient: '507f1f77bcf86cd799439011', doctor: doctor._id, scheduledFor: futureSlot(), reason: 'Ghost' })
      .expect(404);
  });

  it('422s when required booking fields are missing', async () => {
    const res = await request(app).post('/api/appointments').send({ reason: 'Incomplete' }).expect(422);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['patient', 'doctor', 'scheduledFor']));
  });

  it('transitions status through the clinical lifecycle', async () => {
    const { patient, doctor } = await fixtures();
    const created = await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: futureSlot(), reason: 'Check-up' });

    const id = created.body.data._id;
    await request(app).patch(`/api/appointments/${id}/status`).send({ status: 'checked-in' }).expect(200);
    const done = await request(app).patch(`/api/appointments/${id}/status`).send({ status: 'completed' }).expect(200);
    expect(done.body.data.status).toBe('completed');

    await request(app).patch(`/api/appointments/${id}/status`).send({ status: 'teleported' }).expect(400);
  });

  it('cancels an appointment without deleting the record', async () => {
    const { patient, doctor } = await fixtures();
    const created = await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: futureSlot(), reason: 'To cancel' });

    const res = await request(app).delete(`/api/appointments/${created.body.data._id}`).expect(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('filters the appointment list by doctor', async () => {
    const { patient, doctor } = await fixtures();
    await request(app)
      .post('/api/appointments')
      .send({ patient: patient._id, doctor: doctor._id, scheduledFor: futureSlot(72), reason: 'Filterable' });

    const res = await request(app).get(`/api/appointments?doctor=${doctor._id}`).expect(200);
    expect(res.body.count).toBe(1);
  });
});

describe('Health endpoint', () => {
  it('reports a connected database', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.database).toBe('connected');
    expect(res.body.service).toBe('hospital-core-api');
  });
});
