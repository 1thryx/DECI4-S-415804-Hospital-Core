import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { keys } from './queryKeys';

export function useDashboardStats() {
  return useQuery({
    queryKey: keys.dashboard(),
    queryFn: () => api.dashboardStats(),
    staleTime: 20_000,
    // A ward dashboard is left open all shift; background sync keeps it current
    // without a human touching it.
    refetchInterval: 45_000,
    refetchOnWindowFocus: true
  });
}

export function usePatientFlow(days = 7) {
  return useQuery({
    queryKey: keys.patientFlow(days),
    queryFn: () => api.patientFlow(days),
    staleTime: 60_000
  });
}
