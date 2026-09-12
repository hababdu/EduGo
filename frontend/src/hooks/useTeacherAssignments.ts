import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useTeacherOverview } from './useTeacher'; // <--- Mavjud hook'ni import qilamiz

export interface AssignmentItem {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  category?: string;
  mediaUrl?: string | null;
  groupId?: string;
  status?: string;
  [key: string]: unknown;
}

// O'qituvchi guruhlarini overview orqali olamiz
export function useTeacherGroups() {
  const { data } = useTeacherOverview();
  return {
    data: data?.groups || [], // Gurihlar massivi
    isLoading: !data,
  };
}

export function useTeacherAssignments(groupId?: string) {
  return useQuery({
    queryKey: ['teacher', 'assignments', groupId],
    queryFn: () => apiFetch<AssignmentItem[]>(groupId ? `/api/v1/assignments?groupId=${groupId}` : '/api/v1/assignments'),
    enabled: true,
  });
}

export function useTeacherAssignment(id: string) {
  return useQuery({
    queryKey: ['teacher', 'assignments', 'detail', id],
    queryFn: () => apiFetch<AssignmentItem>(`/api/v1/assignments/${id}`),
    enabled: !!id,
  });
}

export function useCreateTeacherAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      type: string;
      category: string;
      mediaUrl?: string;
      groupId: string;
    }) =>
      apiFetch('/api/v1/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
    },
  });
}

export function useUpdateTeacherAssignment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AssignmentItem>) =>
      apiFetch(`/api/v1/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments', 'detail', id] });
    },
  });
}

export function useDeleteTeacherAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/assignments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
    },
  });
}