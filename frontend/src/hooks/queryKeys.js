/** Central key factory — every invalidation in the app points at one of these. */
export const keys = {
  patients: (params = {}) => ['patients', params],
  patient: (id) => ['patient', id],
  doctors: () => ['doctors'],
  schedule: (id, date) => ['schedule', id, date],
  appointments: (params = {}) => ['appointments', params],
  dashboard: () => ['stats', 'dashboard'],
  patientFlow: (days) => ['stats', 'patient-flow', days]
};
