import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useArchivePatient, useCreatePatient, usePatients } from '../hooks/usePatients';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'other',
  email: '',
  phone: '',
  bloodType: 'unknown',
  allergies: ''
};

const BLOOD_TYPES = ['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientManagement() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, error } = usePatients({ search });
  const createPatient = useCreatePatient();
  const archivePatient = useArchivePatient();

  const patients = data?.data ?? [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    createPatient.mutate(
      {
        ...form,
        allergies: form.allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      },
      {
        // The list already shows the optimistic row, so the form can close immediately.
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setFormOpen(false);
        }
      }
    );
  };

  return (
    <section className="view" aria-labelledby="patients-heading">
      <div className="view-header">
        <div>
          <h2 id="patients-heading">Patient Management</h2>
          <p className="view-sub">{data?.total ?? 0} registered patients</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen((open) => !open)}>
          {formOpen ? 'Close' : '+ Register patient'}
        </button>
      </div>

      {formOpen && (
        <form className="panel form-grid" onSubmit={handleSubmit} aria-label="Register a new patient">
          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={handleChange} required />
          </label>
          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={handleChange} required />
          </label>
          <label>
            Date of birth
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required />
          </label>
          <label>
            Gender
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} required />
          </label>
          <label>
            Blood type
            <select name="bloodType" value={form.bloodType} onChange={handleChange}>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </label>
          <label>
            Allergies <span className="hint">comma separated</span>
            <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="penicillin, latex" />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={createPatient.isPending}>
              {createPatient.isPending ? 'Saving…' : 'Register patient'}
            </button>
            {createPatient.isError && (
              <p role="alert" className="form-error">
                {createPatient.error?.message}
              </p>
            )}
          </div>
        </form>
      )}

      <div className="panel">
        <label className="search-field">
          <span className="visually-hidden">Search patients</span>
          <input
            type="search"
            placeholder="Search by name, MRN or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {isError && <p role="alert" className="form-error">{error?.message}</p>}

        {isLoading ? (
          <p className="empty">Loading patients…</p>
        ) : patients.length === 0 ? (
          <p className="empty">No patients match that search.</p>
        ) : (
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">MRN</th>
                <th scope="col">Name</th>
                <th scope="col">Date of birth</th>
                <th scope="col">Blood</th>
                <th scope="col">Contact</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient._id} className={patient.__optimistic ? 'row-pending' : undefined}>
                  <td><code>{patient.mrn}</code></td>
                  <td>
                    {patient.__optimistic ? (
                      `${patient.firstName} ${patient.lastName}`
                    ) : (
                      <Link to={`/patients/${patient._id}`}>
                        {patient.firstName} {patient.lastName}
                      </Link>
                    )}
                  </td>
                  <td>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</td>
                  <td>{patient.bloodType}</td>
                  <td>{patient.phone}</td>
                  <td><span className={`badge status-${patient.status}`}>{patient.status}</span></td>
                  <td>
                    {patient.status === 'active' && !patient.__optimistic && (
                      <button type="button" className="btn btn-small" onClick={() => archivePatient.mutate(patient._id)}>
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </section>
  );
}
