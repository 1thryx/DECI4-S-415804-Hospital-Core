import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import DoctorDashboard from './components/DoctorDashboard';
import PatientManagement from './components/PatientManagement';
import AppointmentScheduling from './components/AppointmentScheduling';
import PatientDetail from './components/PatientDetail';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/patients', label: 'Patients', icon: '☤' },
  { to: '/appointments', label: 'Appointments', icon: '◷' }
];

/**
 * Client-side routed shell. Every navigation swaps the view in place — React Router
 * intercepts the click, so no full page reload occurs and the React Query cache
 * survives across views.
 */
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✚</span>
          <div>
            <h1>Hospital Core</h1>
            <p>Cloud-native healthcare management</p>
          </div>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span aria-hidden="true">{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DoctorDashboard />} />
          <Route path="/patients" element={<PatientManagement />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/appointments" element={<AppointmentScheduling />} />
          <Route path="*" element={<p className="empty">That page does not exist.</p>} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>Hospital Core · patient data is confidential · audit logging is active</span>
      </footer>
    </div>
  );
}
