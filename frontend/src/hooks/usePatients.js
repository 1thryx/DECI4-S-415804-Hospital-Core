import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { keys } from './queryKeys';

export function usePatients(params = {}) {
  return useQuery({
    queryKey: keys.patients(params),
    queryFn: () => api.listPatients(params),
    // Patient lists tolerate slightly stale data; this is what stops every mount
    // from re-hitting the API while a clinician tabs between views.
    staleTime: 30_000,
    placeholderData: (previous) => previous
  });
}

export function usePatient(id) {
  return useQuery({
    queryKey: keys.patient(id),
    queryFn: () => api.getPatient(id),
    enabled: Boolean(id),
    staleTime: 15_000
  });
}

/**
 * Optimistic patient registration. The new record is painted into every cached
 * patient list before the server answers, so the front desk never waits on a
 * spinner mid-triage. On failure the previous cache snapshot is restored.
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.createPatient(data),

    onMutate: async (newPatient) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      const previous = queryClient.getQueriesData({ queryKey: ['patients'] });

      const optimistic = {
        ...newPatient,
        _id: `optimistic-${Date.now()}`,
        mrn: 'MRN-PENDING',
        status: 'active',
        fullName: `${newPatient.firstName} ${newPatient.lastName}`,
        __optimistic: true
      };

      queryClient.setQueriesData({ queryKey: ['patients'] }, (old) =>
        old ? { ...old, data: [optimistic, ...old.data], total: (old.total ?? 0) + 1 } : old
      );

      // Keep the dashboard tile honest while the write is in flight.
      queryClient.setQueryData(keys.dashboard(), (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                totalPatients: old.data.totalPatients + 1,
                activePatients: old.data.activePatients + 1
              }
            }
          : old
      );

      return { previous, optimisticId: optimistic._id };
    },

    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      queryClient.invalidateQueries({ queryKey: keys.dashboard() });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard() });
    }
  });
}

export function useAddHistory(patientId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record) => api.addHistory(patientId, record),

    onMutate: async (record) => {
      await queryClient.cancelQueries({ queryKey: keys.patient(patientId) });
      const previous = queryClient.getQueryData(keys.patient(patientId));

      queryClient.setQueryData(keys.patient(patientId), (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                history: [{ ...record, _id: `optimistic-${Date.now()}`, recordedAt: new Date().toISOString(), __optimistic: true }, ...old.data.history]
              }
            }
          : old
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(keys.patient(patientId), context.previous);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.patient(patientId) })
  });
}

export function useArchivePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.archivePatient(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      const previous = queryClient.getQueriesData({ queryKey: ['patients'] });

      queryClient.setQueriesData({ queryKey: ['patients'] }, (old) =>
        old ? { ...old, data: old.data.map((p) => (p._id === id ? { ...p, status: 'inactive' } : p)) } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard() });
    }
  });
}
