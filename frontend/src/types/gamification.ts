export type TransactionType = 'TEST_REWARD' | 'LESSON_COMPLETION' | 'ADMIN_ADJUST' | 'SPENT';

export interface ScoreTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  reason: string;
  createdAt: string;
}

export interface LeaderboardUser {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  totalScore: number;
  level: number;
  rank: number;
}

export interface UserWalletSummary {
  totalScore: number;
  currentLevel: number;
  nextLevelScore: number;
  progressPercentage: number;
  recentTransactions: ScoreTransaction[];
}