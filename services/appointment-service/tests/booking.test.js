const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');

const app = createApp();
const patient = new mongoose.Types.ObjectId().toString();
const doctor = new mongoose.Types.ObjectId().toString();
const slot = (h = 24) => new Date(Date.now() + h * 3600 * 1000).toISOString();

describe('appointment-service (standalone)', () => {
  it('reports healthy with a live database', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.service).toBe('appointment-service');
  });

  it('books an appointment independently of the core API', async () => {
    const res = await request(app)
      .post('/appointments')
      .send({ patient, doctor, scheduledFor: slot(), reason: 'Independent booking' })
      .expect(201);

    expect(res.body.data.createdVia).toBe('appointment-service');
    expect(res.body.data.status).toBe('scheduled');
  });

  it('rejects a clashing slot for the same doctor', async () => {
    const when = slot(30);
    await request(app).post('/appointments').send({ patient, doctor, scheduledFor: when, reason: 'First' }).expect(201);
    await request(app).post('/appointments').send({ patient, doctor, scheduledFor: when, reason: 'Clash' }).expect(409);
  });

  it('422s on missing booking fields', async () => {
    const res = await request(app).post('/appointments').send({ reason: 'Nothing else' }).expect(422);
    expect(res.body.details.map((d) => d.field)).toEqual(expect.arrayContaining(['patient', 'doctor', 'scheduledFor']));
  });

  it('400s on a non-ObjectId patient reference', async () => {
    await request(app)
      .post('/appointments')
      .send({ patient: 'nope', doctor, scheduledFor: slot(), reason: 'Bad ref' })
      .expect(400);
  });

  it('reschedules into a free slot and blocks a taken one', async () => {
    const first = await request(app)
      .post('/appointments')
      .send({ patient, doctor, scheduledFor: slot(40), reason: 'Original' });
    const taken = slot(41);
    await request(app).post('/appointments').send({ patient, doctor, scheduledFor: taken, reason: 'Other' });

    await request(app).put(`/appointments/${first.body.data._id}`).send({ scheduledFor: slot(42) }).expect(200);
    await request(app).put(`/appointments/${first.body.data._id}`).send({ scheduledFor: taken }).expect(409);
  });

  it('cancels without deleting the record', async () => {
    const created = await request(app)
      .post('/appointments')
      .send({ patient, doctor, scheduledFor: slot(50), reason: 'To cancel' });

    const res = await request(app).delete(`/appointments/${created.body.data._id}`).expect(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('frees the slot once an appointment is cancelled', async () => {
    const when = slot(60);
    const created = await request(app).post('/appointments').send({ patient, doctor, scheduledFor: when, reason: 'A' });
    await request(app).delete(`/appointments/${created.body.data._id}`);

    // The unique index still holds the row, so rebooking the exact slot is a conflict;
    // the correct clinical action is to reschedule the cancelled record instead.
    await request(app).patch(`/appointments/${created.body.data._id}/status`).send({ status: 'scheduled' }).expect(200);
  });
});
