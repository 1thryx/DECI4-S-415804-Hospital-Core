import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoctorDashboard from '../components/DoctorDashboard';
import { appointmentFixture, dashboardFixture, mockByUrl, renderWithProviders } from './testUtils';

describe('<DoctorDashboard />', () => {
  it('renders the ward statistic tiles from the API', async () => {
    mockByUrl({
      '/stats/dashboard': dashboardFixture,
      '/stats/patient-flow': { success: true, data: { registrations: [], appointments: [] } },
      '/appointments': { success: true, count: 0, data: [] }
    });

    renderWithProviders(<DoctorDashboard />);

    expect(await screen.findByText('12')).toBeInTheDocument(); // total patients
    expect(screen.getByText('4')).toBeInTheDocument(); // appointments today
    expect(screen.getByText('9')).toBeInTheDocument(); // upcoming
    expect(screen.getByText('11 active')).toBeInTheDocument();
  });

  it("lists today's clinic appointments", async () => {
    mockByUrl({
      '/stats/dashboard': dashboardFixture,
      '/stats/patient-flow': { success: true, data: { registrations: [], appointments: [] } },
      '/appointments': { success: true, count: 1, data: [appointmentFixture] }
    });

    renderWithProviders(<DoctorDashboard />);

    expect(await screen.findByText('Nadia Ibrahim')).toBeInTheDocument();
    expect(screen.getByText('Dr. Farouk')).toBeInTheDocument();
    expect(screen.getByText('Chest pain evaluation')).toBeInTheDocument();
  });

  it('breaks appointment load down by specialty', async () => {
    mockByUrl({
      '/stats/dashboard': dashboardFixture,
      '/stats/patient-flow': { success: true, data: { registrations: [], appointments: [] } },
      '/appointments': { success: true, count: 0, data: [] }
    });

    renderWithProviders(<DoctorDashboard />);

    expect(await screen.findByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Neurology')).toBeInTheDocument();
  });

  it('optimistically flips an appointment to checked-in on click', async () => {
    const user = userEvent.setup();

    // The PATCH is held open, so the badge can only change via the optimistic cache
    // write — if the UI waited on the server this assertion would time out.
    let resolvePatch;
    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'PATCH') {
        return new Promise((resolve) => {
          resolvePatch = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true, data: { ...appointmentFixture, status: 'checked-in' } })
            });
        });
      }
      if (String(url).includes('/stats/dashboard')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => dashboardFixture });
      }
      if (String(url).includes('/stats/patient-flow')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: { registrations: [] } }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, count: 1, data: [appointmentFixture] })
      });
    });

    renderWithProviders(<DoctorDashboard />);

    const checkIn = await screen.findByRole('button', { name: /check in/i });
    await user.click(checkIn);

    await waitFor(() => expect(screen.getByText('Checked in')).toBeInTheDocument());

    resolvePatch();
  });

  it('surfaces an error panel when the API is unreachable', async () => {
    global.fetch.mockRejectedValue(new Error('Network down'));

    renderWithProviders(<DoctorDashboard />);

    expect(await screen.findByText(/dashboard unavailable/i)).toBeInTheDocument();
  });

  it('shows an empty state when no appointments are booked', async () => {
    mockByUrl({
      '/stats/dashboard': dashboardFixture,
      '/stats/patient-flow': { success: true, data: { registrations: [], appointments: [] } },
      '/appointments': { success: true, count: 0, data: [] }
    });

    renderWithProviders(<DoctorDashboard />);

    expect(await screen.findByText(/no appointments booked for today/i)).toBeInTheDocument();
  });
});
