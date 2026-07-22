import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { keys } from './queryKeys';

export function useAppointments(params = {}) {
  return useQuery({
    queryKey: keys.appointments(params),
    queryFn: () => api.listAppointments(params),
    staleTime: 15_000,
    // The appointment board is a shared screen — poll so a booking made at another
    // desk appears here without anyone reaching for refresh.
    refetchInterval: 60_000,
    placeholderData: (previous) => previous
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: keys.doctors(),
    queryFn: () => api.listDoctors(),
    // The roster barely changes during a shift; cache it hard.
    staleTime: 5 * 60_000
  });
}

/**
 * Optimistic booking. The slot is drawn as taken the moment the clinician confirms,
 * then reconciled against the server's canonical record. A 409 (slot already gone)
 * rolls the board back and surfaces the conflict.
 */
export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.bookAppointment(data),

    onMutate: async (booking) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const previous = queryClient.getQueriesData({ queryKey: ['appointments'] });
      const previousDashboard = queryClient.getQueryData(keys.dashboard());

      const doctors = queryClient.getQueryData(keys.doctors())?.data ?? [];
      const doctor = doctors.find((d) => d._id === booking.doctor);

      const optimistic = {
        ...booking,
        _id: `optimistic-${Date.now()}`,
        status: 'scheduled',
        doctor: doctor ?? { _id: booking.doctor },
        patient: booking.patientPreview ?? { _id: booking.patient },
        __optimistic: true
      };

      queryClient.setQueriesData({ queryKey: ['appointments'] }, (old) =>
        old
          ? {
              ...old,
              count: (old.count ?? 0) + 1,
              data: [...old.data, optimistic].sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
            }
          : old
      );

      const isToday = new Date(booking.scheduledFor).toDateString() === new Date().toDateString();
      queryClient.setQueryData(keys.dashboard(), (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                appointmentsToday: old.data.appointmentsToday + (isToday ? 1 : 0),
                upcomingAppointments: old.data.upcomingAppointments + 1,
                appointmentsByStatus: {
                  ...old.data.appointmentsByStatus,
                  scheduled: (old.data.appointmentsByStatus?.scheduled ?? 0) + 1
                }
              }
            }
          : old
      );

      return { previous, previousDashboard };
    },

    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      if (context?.previousDashboard) queryClient.setQueryData(keys.dashboard(), context.previousDashboard);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    }
  });
}

/** Status changes are the most-tapped control on the board — they must feel instant. */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => api.updateAppointmentStatus(id, status),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const previous = queryClient.getQueriesData({ queryKey: ['appointments'] });

      queryClient.setQueriesData({ queryKey: ['appointments'] }, (old) =>
        old ? { ...old, data: old.data.map((a) => (a._id === id ? { ...a, status, __optimistic: true } : a)) } : old
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard() });
    }
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.cancelAppointment(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const previous = queryClient.getQueriesData({ queryKey: ['appointments'] });

      queryClient.setQueriesData({ queryKey: ['appointments'] }, (old) =>
        old ? { ...old, data: old.data.map((a) => (a._id === id ? { ...a, status: 'cancelled' } : a)) } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard() });
    }
  });
}
