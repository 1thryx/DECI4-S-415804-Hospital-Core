import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentScheduling from '../components/AppointmentScheduling';
import { appointmentFixture, doctorFixture, mockByUrl, patientFixture, renderWithProviders } from './testUtils';

const baseRoutes = {
  '/appointments': { success: true, count: 1, data: [appointmentFixture] },
  '/doctors': { success: true, count: 1, data: [doctorFixture] },
  '/patients': { success: true, count: 1, total: 1, data: [patientFixture] }
};

describe('<AppointmentScheduling />', () => {
  it('renders the appointment board', async () => {
    mockByUrl(baseRoutes);
    renderWithProviders(<AppointmentScheduling />);

    expect(await screen.findByText(/Nadia Ibrahim with Dr\. Farouk/)).toBeInTheDocument();
    expect(screen.getByText('Chest pain evaluation')).toBeInTheDocument();
  });

  it('populates the patient and clinician dropdowns from the API', async () => {
    mockByUrl(baseRoutes);
    renderWithProviders(<AppointmentScheduling />);

    expect(await screen.findByRole('option', { name: /Nadia Ibrahim \(MRN-TEST-0001\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Dr\. Amina Farouk — Cardiology/ })).toBeInTheDocument();
  });

  it('books an appointment and posts the ISO timestamp to the API', async () => {
    const user = userEvent.setup();
    mockByUrl(baseRoutes);
    renderWithProviders(<AppointmentScheduling />);

    await screen.findByRole('option', { name: /Nadia Ibrahim/ });

    const form = screen.getByLabelText(/book an appointment/i);
    await user.selectOptions(screen.getByLabelText(/^patient$/i), 'p1');
    await user.selectOptions(screen.getByLabelText(/clinician/i), 'd1');
    await user.type(screen.getByLabelText(/date & time/i), '2030-06-01T10:30');
    await user.type(screen.getByLabelText(/reason for visit/i), 'Follow-up review');

    await user.click(within(form).getByRole('button', { name: /confirm booking/i }));

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'POST');
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall[1].body);
      expect(body.patient).toBe('p1');
      expect(body.doctor).toBe('d1');
      expect(body.reason).toBe('Follow-up review');
      expect(body.scheduledFor).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  it('surfaces a slot conflict returned by the booking service', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ success: false, error: 'That slot is already booked for this doctor' })
        });
      }
      const match = Object.keys(baseRoutes).find((key) => String(url).includes(key));
      return Promise.resolve({ ok: true, status: 200, json: async () => baseRoutes[match] ?? { success: true, data: [] } });
    });

    renderWithProviders(<AppointmentScheduling />);
    await screen.findByRole('option', { name: /Nadia Ibrahim/ });

    await user.selectOptions(screen.getByLabelText(/^patient$/i), 'p1');
    await user.selectOptions(screen.getByLabelText(/clinician/i), 'd1');
    await user.type(screen.getByLabelText(/date & time/i), '2030-06-01T10:30');
    await user.type(screen.getByLabelText(/reason for visit/i), 'Clashing booking');
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already booked/i);
  });

  it('filters the board by appointment status', async () => {
    const user = userEvent.setup();
    mockByUrl(baseRoutes);
    renderWithProviders(<AppointmentScheduling />);
    await screen.findByText(/Nadia Ibrahim with/);

    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'completed');

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('status=completed'), expect.anything())
    );
  });
});
