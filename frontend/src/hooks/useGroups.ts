import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface GroupItem {
  id: string;
  name: string;
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiFetch<GroupItem[]>('/api/v1/groups'),
  });
}
