import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface TestListItem {
  id: string;
  title: string;
  status: string;
  passingScore: number;
  durationSeconds: number;
  subject?: { title: string } | null;
  _count: { questions: number; assignments: number; attempts: number };
}

export interface TestDetail extends TestListItem {
  description?: string | null;
  randomQuestions: boolean;
  randomAnswerOrder: boolean;
  questions: { question: { id: string; text: string } }[];
  assignments: { id: string; targetType: string; group?: { name: string } | null; assignedAt: string }[];
}

export function useTests() {
  return useQuery({
    queryKey: ['tests'],
    queryFn: () => apiFetch<TestListItem[]>('/api/v1/tests'),
  });
}

export function useTestDetail(id: string) {
  return useQuery({
    queryKey: ['tests', id],
    queryFn: () => apiFetch<TestDetail>(`/api/v1/tests/${id}`),
    enabled: !!id,
  });
}

export interface CreateTestInput {
  title: string;
  durationSeconds: number;
  passingScore: number;
  questionIds: string[];
  randomQuestions?: boolean;
  randomAnswerOrder?: boolean;
  questionCount?: number;
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTestInput) =>
      apiFetch('/api/v1/tests', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  });
}

export function usePublishTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/tests/${id}/publish`, { method: 'PATCH' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['tests'] });
      qc.invalidateQueries({ queryKey: ['tests', id] });
    },
  });
}

export interface AssignTestInput {
  targetType: 'ALL' | 'GROUP' | 'INDIVIDUAL';
  groupId?: string;
  studentId?: string;
  deadline?: string;
}

export function useAssignTest(testId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignTestInput) =>
      apiFetch(`/api/v1/tests/${testId}/assign`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests', testId] }),
  });
}

export function useReopenTest(testId: string) {
  return useMutation({
    mutationFn: (studentId: string) =>
      apiFetch(`/api/v1/tests/${testId}/reopen`, {
        method: 'PATCH',
        body: JSON.stringify({ studentId }),
      }),
  });
}

export interface TestAnalytics {
  testTitle: string;
  participants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSeconds: number;
  passRate: number;
  failRate: number;
}

export function useTestAnalytics(testId: string) {
  return useQuery({
    queryKey: ['analytics', 'tests', testId],
    queryFn: () => apiFetch<TestAnalytics>(`/api/v1/analytics/tests/${testId}`),
    enabled: !!testId,
  });
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercent: number | null;
}

export function useQuestionAnalytics(testId: string) {
  return useQuery({
    queryKey: ['analytics', 'tests', testId, 'questions'],
    queryFn: () => apiFetch<QuestionAnalytics[]>(`/api/v1/analytics/tests/${testId}/questions`),
    enabled: !!testId,
  });
}
