import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface DailyChallenge {
  id: string;
  title: string;
  rewardScore: number;
  rewardXp: number;
  test: { id: string; title: string; durationSeconds: number } | null;
  completed: boolean;
}

export function useDailyChallenge() {
  return useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiFetch<DailyChallenge | null>('/api/v1/challenges/today'),
  });
}
