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