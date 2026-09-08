import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuestionItem {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT_ANSWER';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  text: string;
  points: number;
  options: QuestionOption[];
}

export interface CreateQuestionInput {
  type: string;
  difficulty: string;
  text: string;
  points: number;
  options: { text: string; isCorrect: boolean }[];
}

export function useQuestions() {
  return useQuery({
    queryKey: ['questions'],
    queryFn: () => apiFetch<QuestionItem[]>('/api/v1/questions'),
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionInput) =>
      apiFetch('/api/v1/questions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/questions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}
