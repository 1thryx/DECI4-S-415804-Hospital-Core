const request = require('supertest');
const { createApp } = require('../src/app');
const Patient = require('../src/models/Patient');

const app = createApp();

const validPatient = {
  firstName: 'Nadia',
  lastName: 'Ibrahim',
  dateOfBirth: '1985-03-14',
  gender: 'female',
  email: 'nadia.ibrahim@example.com',
  phone: '+20 100 111 2233',
  bloodType: 'A+'
};

describe('Patients API', () => {
  describe('POST /api/patients', () => {
    it('creates a patient and auto-generates an MRN', async () => {
      const res = await request(app).post('/api/patients').send(validPatient).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.mrn).toMatch(/^MRN-/);
      expect(res.body.data.firstName).toBe('Nadia');
      expect(res.body.data.status).toBe('active');
    });

    it('rejects a patient with a malformed email', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ ...validPatient, email: 'not-an-email' })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.details.map((d) => d.field)).toContain('email');
    });

    it('rejects a patient missing required identity fields', async () => {
      const res = await request(app).post('/api/patients').send({ email: 'x@y.com' }).expect(422);
      const fields = res.body.details.map((d) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['firstName', 'lastName', 'phone']));
    });
  });

  describe('GET /api/patients', () => {
    beforeEach(async () => {
      await Patient.create([
        validPatient,
        { ...validPatient, firstName: 'Tarek', lastName: 'Salem', email: 'tarek@example.com' }
      ]);
    });

    it('lists all patients with a total count', async () => {
      const res = await request(app).get('/api/patients').expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
    });

    it('filters by search term across name and MRN', async () => {
      const res = await request(app).get('/api/patients?search=Tarek').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].firstName).toBe('Tarek');
    });
  });

  describe('GET /api/patients/:id', () => {
    it('returns the patient with embedded history and appointments', async () => {
      const patient = await Patient.create(validPatient);
      const res = await request(app).get(`/api/patients/${patient._id}`).expect(200);

      expect(res.body.data.fullName).toBe('Nadia Ibrahim');
      expect(res.body.data.history).toEqual([]);
      expect(res.body.data.appointments).toEqual([]);
    });

    it('404s for an unknown id', async () => {
      await request(app).get('/api/patients/507f1f77bcf86cd799439011').expect(404);
    });

    it('400s for a malformed id', async () => {
      await request(app).get('/api/patients/not-an-objectid').expect(400);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('archives rather than destroys the clinical record', async () => {
      const patient = await Patient.create(validPatient);
      await request(app).delete(`/api/patients/${patient._id}`).expect(200);

      const stored = await Patient.findById(patient._id);
      expect(stored).not.toBeNull();
      expect(stored.status).toBe('inactive');
    });
  });

  describe('POST /api/patients/:id/history', () => {
    it('attaches a medical history record', async () => {
      const patient = await Patient.create(validPatient);
      const res = await request(app)
        .post(`/api/patients/${patient._id}/history`)
        .send({ type: 'diagnosis', title: 'Essential hypertension', icd10Code: 'I10' })
        .expect(201);

      expect(res.body.data.title).toBe('Essential hypertension');
      expect(String(res.body.data.patient)).toBe(String(patient._id));
    });
  });
});
