import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** A fresh, retry-free QueryClient per test so cache never leaks between cases. */
export function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchInterval: false },
      mutations: { retry: false }
    }
  });
}

export function renderWithProviders(ui, { route = '/', client = makeClient() } = {}) {
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...result, client };
}

/** Queues an ok JSON response on the global fetch mock. */
export function mockJson(payload, { ok = true, status = 200 } = {}) {
  global.fetch.mockResolvedValueOnce({ ok, status, json: async () => payload });
}

/** Routes fetch by URL substring — for components that fire several parallel queries. */
export function mockByUrl(routes) {
  global.fetch.mockImplementation((url) => {
    const match = Object.keys(routes).find((key) => String(url).includes(key));
    if (!match) return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: [] }) });

    const entry = routes[match];
    const { payload, status = 200, ok = status < 400 } = typeof entry === 'object' && 'payload' in entry ? entry : { payload: entry };
    return Promise.resolve({ ok, status, json: async () => payload });
  });
}

export const patientFixture = {
  _id: 'p1',
  mrn: 'MRN-TEST-0001',
  firstName: 'Nadia',
  lastName: 'Ibrahim',
  dateOfBirth: '1985-03-14T00:00:00.000Z',
  gender: 'female',
  email: 'nadia.ibrahim@example.com',
  phone: '+20 100 111 2233',
  bloodType: 'A+',
  allergies: ['penicillin'],
  status: 'active'
};

export const doctorFixture = {
  _id: 'd1',
  firstName: 'Amina',
  lastName: 'Farouk',
  specialty: 'Cardiology',
  licenseNumber: 'LIC-CARD-1001',
  active: true
};

export const appointmentFixture = {
  _id: 'a1',
  patient: { _id: 'p1', firstName: 'Nadia', lastName: 'Ibrahim', mrn: 'MRN-TEST-0001' },
  doctor: { _id: 'd1', firstName: 'Amina', lastName: 'Farouk', specialty: 'Cardiology' },
  scheduledFor: new Date().toISOString(),
  reason: 'Chest pain evaluation',
  status: 'scheduled'
};

export const dashboardFixture = {
  success: true,
  data: {
    totalPatients: 12,
    activePatients: 11,
    totalDoctors: 6,
    appointmentsToday: 4,
    upcomingAppointments: 9,
    appointmentsByStatus: { scheduled: 9, completed: 12 },
    appointmentsBySpecialty: [
      { specialty: 'Cardiology', count: 8 },
      { specialty: 'Neurology', count: 5 }
    ],
    recentActivity: [
      { _id: 'l1', action: 'POST /api/appointments', entity: 'Appointment', actor: 'seed-script', createdAt: new Date().toISOString() }
    ],
    generatedAt: new Date().toISOString()
  }
};
