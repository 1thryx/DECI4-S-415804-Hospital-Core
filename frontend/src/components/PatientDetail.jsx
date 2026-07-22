import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAddHistory, usePatient } from '../hooks/usePatients';

const RECORD_TYPES = ['diagnosis', 'prescription', 'lab-result', 'procedure', 'note'];
const EMPTY_RECORD = { type: 'note', title: '', description: '', icd10Code: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = usePatient(id);
  const addHistory = useAddHistory(id);
  const [record, setRecord] = useState(EMPTY_RECORD);

  const patient = data?.data;

  const handleSubmit = (event) => {
    event.preventDefault();
    // Optimistic: the record lands in the timeline immediately (see useAddHistory).
    addHistory.mutate(record, { onSuccess: () => setRecord(EMPTY_RECORD) });
  };

  if (isLoading) return <p className="empty">Loading patient record…</p>;
  if (isError) return <p role="alert" className="form-error">{error?.message}</p>;

  return (
    <section className="view" aria-labelledby="patient-heading">
      <div className="view-header">
        <div>
          <Link to="/patients" className="back-link">← All patients</Link>
          <h2 id="patient-heading">{patient.firstName} {patient.lastName}</h2>
          <p className="view-sub">
            <code>{patient.mrn}</code> · {patient.bloodType} · born {new Date(patient.dateOfBirth).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge status-${patient.status}`}>{patient.status}</span>
      </div>

      <div className="detail-columns">
        <section className="panel">
          <h3>Contact &amp; alerts</h3>
          <dl className="detail-list">
            <dt>Email</dt><dd>{patient.email}</dd>
            <dt>Phone</dt><dd>{patient.phone}</dd>
            <dt>Address</dt>
            <dd>{patient.address?.line1 ? `${patient.address.line1}, ${patient.address.city}` : '—'}</dd>
            <dt>Allergies</dt>
            <dd>
              {patient.allergies?.length ? (
                patient.allergies.map((a) => <span key={a} className="badge badge-alert">{a}</span>)
              ) : (
                'None recorded'
              )}
            </dd>
          </dl>

          <h3>Appointments</h3>
          {patient.appointments?.length === 0 ? (
            <p className="empty">No appointments on record.</p>
          ) : (
            <ul className="mini-list">
              {patient.appointments.map((appt) => (
                <li key={appt._id}>
                  <span>{new Date(appt.scheduledFor).toLocaleString()}</span>
                  <span className={`badge status-${appt.status}`}>{appt.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h3>Clinical history</h3>

          <form className="form-stack inline-form" onSubmit={handleSubmit} aria-label="Add a clinical record">
            <label>
              Record type
              <select value={record.type} onChange={(e) => setRecord((r) => ({ ...r, type: e.target.value }))}>
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input value={record.title} onChange={(e) => setRecord((r) => ({ ...r, title: e.target.value }))} required />
            </label>
            <label>
              Notes
              <textarea rows={2} value={record.description} onChange={(e) => setRecord((r) => ({ ...r, description: e.target.value }))} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={addHistory.isPending}>
              {addHistory.isPending ? 'Filing…' : 'File record'}
            </button>
          </form>

          {patient.history?.length === 0 ? (
            <p className="empty">No clinical records filed.</p>
          ) : (
            <ol className="timeline">
              {patient.history.map((entry) => (
                <li key={entry._id} className={entry.__optimistic ? 'row-pending' : undefined}>
                  <span className={`badge type-${entry.type}`}>{entry.type}</span>
                  <div>
                    <p className="timeline-title">{entry.title}{entry.icd10Code ? ` (${entry.icd10Code})` : ''}</p>
                    {entry.description && <p className="timeline-desc">{entry.description}</p>}
                    <p className="timeline-meta">
                      {new Date(entry.recordedAt).toLocaleDateString()}
                      {entry.doctor?.lastName ? ` · Dr. ${entry.doctor.lastName}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </section>
  );
}
