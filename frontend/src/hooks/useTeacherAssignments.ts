import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useTeacherOverview } from './useTeacher';

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
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          type: data.type,               
          category: data.category,       
          mediaUrl: data.mediaUrl,
          groupId: data.groupId,         
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
      alert('Material muvaffaqiyatli saqlandi!'); // Bildirishnoma qo'shildi
    },
    onError: (error: any) => {
      alert(error?.message || 'Saqlashda xatolik yuz berdi!');
    }
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
      alert('Material muvaffaqiyatli yangilandi!'); // Bildirishnoma qo'shildi
    },
    onError: (error: any) => {
      alert(error?.message || 'Yangilashda xatolik yuz berdi!');
    }
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
      alert('Material muvaffaqiyatli o\'chirildi!'); // Bildirishnoma qo'shildi
    },
    onError: (error: any) => {
      alert(error?.message || 'O\'chirishda xatolik yuz berdi!');
    }
  });
}