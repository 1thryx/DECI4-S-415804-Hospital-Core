/* global __API_BASE__ */

/**
 * Single fetch wrapper for the whole SPA. __API_BASE__ is substituted by Vite at build
 * time (see vite.config.js) and provided as a Jest global in tests — so no module here
 * ever touches import.meta, and the same code runs in both environments.
 */
const API_BASE = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : '/api';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status, payload.details);
  }

  return payload;
}

export const api = {
  // --- Patients ---
  listPatients: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/patients${qs ? `?${qs}` : ''}`);
  },
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (data) => request('/patients', { method: 'POST', body: data }),
  updatePatient: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: data }),
  archivePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),
  addHistory: (id, data) => request(`/patients/${id}/history`, { method: 'POST', body: data }),

  // --- Doctors ---
  listDoctors: () => request('/doctors'),
  getSchedule: (id, date) => request(`/doctors/${id}/schedule${date ? `?date=${date}` : ''}`),

  // --- Appointments ---
  listAppointments: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/appointments${qs ? `?${qs}` : ''}`);
  },
  bookAppointment: (data) => request('/appointments', { method: 'POST', body: data }),
  updateAppointmentStatus: (id, status) => request(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
  cancelAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),

  // --- Stats ---
  dashboardStats: () => request('/stats/dashboard'),
  patientFlow: (days = 7) => request(`/stats/patient-flow?days=${days}`),
  health: () => request('/health')
};

export { API_BASE };
