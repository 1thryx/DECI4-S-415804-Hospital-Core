import { useState } from 'react';
import { useAppointments, useBookAppointment, useCancelAppointment, useDoctors, useUpdateAppointmentStatus } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';

const EMPTY_BOOKING = { patient: '', doctor: '', scheduledFor: '', durationMinutes: 30, reason: '' };

const STATUS_FILTERS = ['', 'scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'];

export default function AppointmentScheduling() {
  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: appointmentsData, isLoading } = useAppointments(statusFilter ? { status: statusFilter } : {});
  const { data: doctorsData } = useDoctors();
  const { data: patientsData } = usePatients({ limit: 100 });

  const bookAppointment = useBookAppointment();
  const updateStatus = useUpdateAppointmentStatus();
  const cancelAppointment = useCancelAppointment();

  const appointments = appointmentsData?.data ?? [];
  const doctors = doctorsData?.data ?? [];
  const patients = patientsData?.data ?? [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setBooking((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const selected = patients.find((p) => p._id === booking.patient);

    bookAppointment.mutate(
      {
        ...booking,
        durationMinutes: Number(booking.durationMinutes),
        scheduledFor: new Date(booking.scheduledFor).toISOString(),
        // Passed only so the optimistic row can render a real name before the
        // server round-trip; the API ignores it.
        patientPreview: selected ? { _id: selected._id, firstName: selected.firstName, lastName: selected.lastName } : undefined
      },
      { onSuccess: () => setBooking(EMPTY_BOOKING) }
    );
  };

  return (
    <section className="view" aria-labelledby="appointments-heading">
      <div className="view-header">
        <div>
          <h2 id="appointments-heading">Appointment Scheduling</h2>
          <p className="view-sub">{appointments.length} appointments in view</p>
        </div>
      </div>

      <div className="schedule-layout">
        <form className="panel form-stack" onSubmit={handleSubmit} aria-label="Book an appointment">
          <h3>Book an appointment</h3>

          <label>
            Patient
            <select name="patient" value={booking.patient} onChange={handleChange} required>
              <option value="">Select a patient…</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.firstName} {patient.lastName} ({patient.mrn})
                </option>
              ))}
            </select>
          </label>

          <label>
            Clinician
            <select name="doctor" value={booking.doctor} onChange={handleChange} required>
              <option value="">Select a clinician…</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  Dr. {doctor.firstName} {doctor.lastName} — {doctor.specialty}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date &amp; time
            <input type="datetime-local" name="scheduledFor" value={booking.scheduledFor} onChange={handleChange} required />
          </label>

          <label>
            Duration (minutes)
            <select name="durationMinutes" value={booking.durationMinutes} onChange={handleChange}>
              {[15, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label>
            Reason for visit
            <textarea name="reason" value={booking.reason} onChange={handleChange} rows={3} required />
          </label>

          <button type="submit" className="btn btn-primary" disabled={bookAppointment.isPending}>
            {bookAppointment.isPending ? 'Booking…' : 'Confirm booking'}
          </button>

          {bookAppointment.isError && (
            <p role="alert" className="form-error">
              {bookAppointment.error?.message}
            </p>
          )}
          {bookAppointment.isSuccess && <p className="form-success">Appointment confirmed.</p>}
        </form>

        <div className="panel">
          <div className="panel-header">
            <h3>Appointment board</h3>
            <label className="inline-field">
              <span className="visually-hidden">Filter by status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_FILTERS.map((status) => (
                  <option key={status || 'all'} value={status}>
                    {status || 'All statuses'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="empty">Loading appointments…</p>
          ) : appointments.length === 0 ? (
            <p className="empty">No appointments to show.</p>
          ) : (
            <ul className="appointment-list">
              {appointments.map((appt) => (
                <li key={appt._id} className={`appointment-card${appt.__optimistic ? ' row-pending' : ''}`}>
                  <div className="appointment-when">
                    <strong>{new Date(appt.scheduledFor).toLocaleDateString()}</strong>
                    <span>{new Date(appt.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="appointment-body">
                    <p className="appointment-title">
                      {appt.patient?.firstName ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Patient'}
                      {' with '}
                      {appt.doctor?.lastName ? `Dr. ${appt.doctor.lastName}` : 'clinician'}
                    </p>
                    <p className="appointment-reason">{appt.reason}</p>
                    <span className={`badge status-${appt.status}`}>{appt.status}</span>
                  </div>

                  <div className="appointment-actions">
                    {appt.status === 'scheduled' && !appt.__optimistic && (
                      <>
                        <button type="button" className="btn btn-small" onClick={() => updateStatus.mutate({ id: appt._id, status: 'checked-in' })}>
                          Check in
                        </button>
                        <button type="button" className="btn btn-small btn-danger" onClick={() => cancelAppointment.mutate(appt._id)}>
                          Cancel
                        </button>
                      </>
                    )}
                    {appt.status === 'checked-in' && (
                      <button type="button" className="btn btn-small btn-primary" onClick={() => updateStatus.mutate({ id: appt._id, status: 'completed' })}>
                        Complete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
