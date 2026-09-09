import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import type { AdminOverview, AdminStudentListResponse } from '../types/admin';

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverview>('/api/v1/admin/overview'),
    staleTime: 60_000,
  });
}
export function useAdminTeachers() {
  return useQuery({
    queryKey: ['admin', 'teachers'],
    queryFn: () => apiFetch<any>('/api/v1/admin/teachers'), // yoki '/api/v1/teachers'
  });
}
export function useAdminStudents(params: { search?: string; status?: string; page: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page));

  return useQuery({
    queryKey: ['admin', 'students', params],
    queryFn: () =>
      apiFetch<AdminStudentListResponse>(`/api/v1/admin/students?${query.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminStudentDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'students', id],
    queryFn: () => apiFetch<any>(`/api/v1/admin/students/${id}`),
    enabled: !!id,
  });
}

export function useBlockStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      apiFetch(`/api/v1/admin/students/${id}/${blocked ? 'block' : 'unblock'}`, {
        method: 'PATCH',
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', variables.id] });
    },
  });
}

export function useAdjustScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason: string }) =>
      apiFetch(`/api/v1/admin/students/${id}/score`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, reason }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', variables.id] });
    },
  });
}
