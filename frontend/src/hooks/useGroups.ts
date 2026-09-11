import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count?: {
    students: number;
  };
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiFetch<GroupItem[]>('/api/v1/groups'),
  });
}

// Guruh tafsilotlarini olish
export function useGroup(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => apiFetch<GroupItem>(`/api/v1/groups/${id}`),
    enabled: !!id,
  });
}

// Guruh a'zolarini (talabalarini) olish
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => apiFetch<any[]>(`/api/v1/groups/${groupId}/students`),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newGroup: { name: string; description?: string }) =>
      apiFetch<GroupItem>('/api/v1/groups', {
        method: 'POST',
        body: JSON.stringify(newGroup),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useAddStudentToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      apiFetch(`/api/v1/groups/${groupId}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-students', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

// Talabani guruhdan chiqarish
export function useRemoveStudentFromGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      apiFetch(`/api/v1/groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-students', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

// Guruhga o'qituvchi tayinlash
export function useAssignGroupTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, teacherId }: { groupId: string; teacherId: string | null }) =>
      apiFetch(`/api/v1/groups/${groupId}/teacher`, {
        method: 'PATCH',
        body: JSON.stringify({ teacherId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch(`/api/v1/groups/${groupId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}