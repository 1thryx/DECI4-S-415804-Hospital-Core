import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientManagement from '../components/PatientManagement';
import { mockByUrl, patientFixture, renderWithProviders } from './testUtils';

const listPayload = { success: true, count: 1, total: 1, data: [patientFixture] };

describe('<PatientManagement />', () => {
  it('renders the patient roster', async () => {
    mockByUrl({ '/patients': listPayload });
    renderWithProviders(<PatientManagement />);

    expect(await screen.findByText('Nadia Ibrahim')).toBeInTheDocument();
    expect(screen.getByText('MRN-TEST-0001')).toBeInTheDocument();
    expect(screen.getByText('1 registered patients')).toBeInTheDocument();
  });

  it('toggles the registration form open and closed', async () => {
    const user = userEvent.setup();
    mockByUrl({ '/patients': listPayload });
    renderWithProviders(<PatientManagement />);

    expect(screen.queryByLabelText(/register a new patient/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /register patient/i }));
    expect(screen.getByLabelText(/register a new patient/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByLabelText(/register a new patient/i)).not.toBeInTheDocument();
  });

  it('paints a new patient into the list optimistically before the server responds', async () => {
    const user = userEvent.setup();

    let resolveCreate;
    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        // Hold the response open so the assertion can only pass via the optimistic cache write.
        return new Promise((resolve) => {
          resolveCreate = () =>
            resolve({ ok: true, status: 201, json: async () => ({ success: true, data: { ...patientFixture, _id: 'p2' } }) });
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => listPayload });
    });

    renderWithProviders(<PatientManagement />);
    await screen.findByText('Nadia Ibrahim');

    await user.click(screen.getByRole('button', { name: /register patient/i }));
    const form = screen.getByLabelText(/register a new patient/i);

    await user.type(within(form).getByLabelText(/first name/i), 'Ziad');
    await user.type(within(form).getByLabelText(/last name/i), 'Hafez');
    await user.type(within(form).getByLabelText(/date of birth/i), '1991-09-17');
    await user.type(within(form).getByLabelText(/^email$/i), 'ziad.hafez@example.com');
    await user.type(within(form).getByLabelText(/phone/i), '+20 100 666 7788');

    await user.click(within(form).getByRole('button', { name: /register patient/i }));

    // Row appears while the POST is still in flight, tagged with a pending MRN.
    await waitFor(() => expect(screen.getByText('Ziad Hafez')).toBeInTheDocument());
    expect(screen.getByText('MRN-PENDING')).toBeInTheDocument();

    resolveCreate();
  });

  it('rolls the optimistic row back when the server rejects the registration', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({ success: false, error: 'Validation failed' })
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => listPayload });
    });

    renderWithProviders(<PatientManagement />);
    await screen.findByText('Nadia Ibrahim');

    await user.click(screen.getByRole('button', { name: /register patient/i }));
    const form = screen.getByLabelText(/register a new patient/i);

    await user.type(within(form).getByLabelText(/first name/i), 'Bad');
    await user.type(within(form).getByLabelText(/last name/i), 'Record');
    await user.type(within(form).getByLabelText(/date of birth/i), '1991-09-17');
    await user.type(within(form).getByLabelText(/^email$/i), 'bad@example.com');
    await user.type(within(form).getByLabelText(/phone/i), '000');
    await user.click(within(form).getByRole('button', { name: /register patient/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/validation failed/i);
    await waitFor(() => expect(screen.queryByText('Bad Record')).not.toBeInTheDocument());
  });

  it('sends the search term to the API', async () => {
    const user = userEvent.setup();
    mockByUrl({ '/patients': listPayload });
    renderWithProviders(<PatientManagement />);
    await screen.findByText('Nadia Ibrahim');

    await user.type(screen.getByRole('searchbox'), 'Hafez');

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=Hafez'), expect.anything())
    );
  });

  it('shows an empty state when the search matches nothing', async () => {
    mockByUrl({ '/patients': { success: true, count: 0, total: 0, data: [] } });
    renderWithProviders(<PatientManagement />);

    expect(await screen.findByText(/no patients match that search/i)).toBeInTheDocument();
  });
});
