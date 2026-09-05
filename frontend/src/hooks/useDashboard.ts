import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import type { DashboardData } from '../types/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiFetch<DashboardData>('/api/v1/dashboard/me'),
    staleTime: 30_000,
  });
}
