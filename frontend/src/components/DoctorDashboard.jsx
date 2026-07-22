import { useMemo } from 'react';
import { useDashboardStats, usePatientFlow } from '../hooks/useDashboard';
import { useAppointments, useUpdateAppointmentStatus } from '../hooks/useAppointments';
import StatCard from './StatCard';

const STATUS_LABEL = {
  scheduled: 'Scheduled',
  'checked-in': 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No show'
};

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function DoctorDashboard() {
  const { data, isLoading, isError, error, isFetching } = useDashboardStats();
  const { data: flow } = usePatientFlow(7);
  const range = useMemo(todayRange, []);
  const { data: todays } = useAppointments(range);
  const updateStatus = useUpdateAppointmentStatus();

  const stats = data?.data;
  const appointments = todays?.data ?? [];

  if (isError) {
    return (
      <section className="panel error-panel">
        <h2>Dashboard unavailable</h2>
        <p>{error?.message ?? 'Could not reach the Hospital Core API.'}</p>
      </section>
    );
  }

  const peakDay = flow?.data?.registrations?.reduce((max, d) => (d.count > (max?.count ?? 0) ? d : max), null);

  return (
    <section className="view" aria-labelledby="dashboard-heading">
      <div className="view-header">
        <div>
          <h2 id="dashboard-heading">Doctor Dashboard</h2>
          <p className="view-sub">Live ward overview{isFetching && !isLoading ? ' · syncing…' : ''}</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total patients" value={stats?.totalPatients ?? 0} hint={`${stats?.activePatients ?? 0} active`} loading={isLoading} />
        <StatCard label="Appointments today" value={stats?.appointmentsToday ?? 0} tone="primary" loading={isLoading} />
        <StatCard label="Upcoming" value={stats?.upcomingAppointments ?? 0} hint="Scheduled ahead" loading={isLoading} />
        <StatCard label="Clinicians on duty" value={stats?.totalDoctors ?? 0} tone="muted" loading={isLoading} />
      </div>

      <div className="dashboard-columns">
        <section className="panel" aria-labelledby="today-heading">
          <h3 id="today-heading">Today&apos;s clinic list</h3>

          {appointments.length === 0 ? (
            <p className="empty">No appointments booked for today.</p>
          ) : (
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Clinician</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt._id} className={appt.__optimistic ? 'row-pending' : undefined}>
                    <td>{new Date(appt.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{appt.patient?.firstName ? `${appt.patient.firstName} ${appt.patient.lastName}` : '—'}</td>
                    <td>{appt.doctor?.lastName ? `Dr. ${appt.doctor.lastName}` : '—'}</td>
                    <td className="cell-wrap">{appt.reason}</td>
                    <td>
                      <span className={`badge status-${appt.status}`}>{STATUS_LABEL[appt.status] ?? appt.status}</span>
                    </td>
                    <td>
                      {appt.status === 'scheduled' && (
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => updateStatus.mutate({ id: appt._id, status: 'checked-in' })}
                        >
                          Check in
                        </button>
                      )}
                      {appt.status === 'checked-in' && (
                        <button
                          type="button"
                          className="btn btn-small btn-primary"
                          onClick={() => updateStatus.mutate({ id: appt._id, status: 'completed' })}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>

        <div className="dashboard-side">
          <section className="panel" aria-labelledby="specialty-heading">
            <h3 id="specialty-heading">Load by specialty</h3>
            {!stats?.appointmentsBySpecialty?.length ? (
              <p className="empty">No appointment data yet.</p>
            ) : (
              <ul className="bar-list">
                {stats.appointmentsBySpecialty.map(({ specialty, count }) => {
                  const max = stats.appointmentsBySpecialty[0].count || 1;
                  return (
                    <li key={specialty}>
                      <span className="bar-label" title={specialty}>{specialty}</span>
                      <span className="bar-track">
                        <span className="bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                      </span>
                      <span className="bar-value">{count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel" aria-labelledby="activity-heading">
            <h3 id="activity-heading">Recent activity</h3>
            {peakDay && <p className="view-sub">Busiest intake day: {peakDay._id} ({peakDay.count} registered)</p>}
            {!stats?.recentActivity?.length ? (
              <p className="empty">No recorded activity.</p>
            ) : (
              <ul className="activity-list">
                {stats.recentActivity.map((log) => (
                  <li key={log._id}>
                    <code>{log.action}</code>
                    <span className="activity-meta">
                      {log.entity} · {log.actor} · {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
