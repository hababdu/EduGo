import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import type { LeaderboardUser, UserWalletSummary } from '../types/gamification';

export function useLeaderboard(limit: number = 50) {
  return useQuery({
    queryKey: ['gamification', 'leaderboard', limit],
    queryFn: () => apiFetch<LeaderboardUser[]>(`/api/v1/gamification/leaderboard?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useUserWallet() {
  return useQuery({
    queryKey: ['gamification', 'wallet'],
    queryFn: () => apiFetch<UserWalletSummary>('/api/v1/gamification/wallet'),
  });
}