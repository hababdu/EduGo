import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiClient } from '../lib/api-client';
import type {
  AdminOverview,
  AdminStudentListResponse,
  QuestionCategoryDTO,
  CreateQuestionDTO,
  BulkImportResponseDTO,
  ReOpenSessionDTO,
} from '../types/admin';

// ==========================================
// 1. STATISTIKA VA TALABALAR HOOK'LARI
// ==========================================

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverview>('/api/v1/admin/overview'),
    staleTime: 60_000,
  });
}

export function useAdminStudents(params: { search?: string; status?: string; page: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page));

  return useQuery({
    queryKey: ['admin', 'students', params],
    queryFn: () =>
      apiFetch<AdminStudentListResponse>(`/api/v1/admin/students?${query.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminStudentDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'students', id],
    queryFn: () => apiFetch<any>(`/api/v1/admin/students/${id}`),
    enabled: !!id,
  });
}

export function useBlockStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      apiClient.patch(`/api/v1/admin/students/${id}/${blocked ? 'block' : 'unblock'}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', variables.id] });
    },
  });
}

export function useAdjustScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason: string }) =>
      apiClient.patch(`/api/v1/admin/students/${id}/score`, { amount, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', variables.id] });
    },
  });
}

// ==========================================
// 2. SAVOLLAR BANKI VA EXCEL IMPORT HOOK'LARI
// ==========================================

export function useAdminQuestionCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiFetch<QuestionCategoryDTO[]>('/api/v1/admin/question-categories'),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionDTO) =>
      apiClient.post('/api/v1/admin/questions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });
}

export function useImportQuestionsExcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, file }: { categoryId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', categoryId);

      const token = localStorage.getItem('accessToken') || '';
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

      const res = await fetch(`${baseUrl}/api/v1/admin/questions/import`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Excel faylni import qilishda xatolik');
      }

      return (await res.json()) as BulkImportResponseDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });
}

export function useReOpenTestSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReOpenSessionDTO) =>
      apiClient.post('/api/v1/admin/tests/re-open', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
  });
}

// ==========================================
// 3. AMALIY WRAPPER HOOK (Har ikkala uslub uchun)
// ==========================================

export function useAdmin() {
  const overviewQuery = useAdminOverview();
  const categoriesQuery = useAdminQuestionCategories();
  
  const createQuestionMutation = useCreateQuestion();
  const importQuestionsMutation = useImportQuestionsExcel();
  const reOpenSessionMutation = useReOpenTestSession();
  const blockStudentMutation = useBlockStudent();
  const adjustScoreMutation = useAdjustScore();

  return {
    // Data & State
    overview: overviewQuery.data,
    categories: categoriesQuery.data || [],
    isLoading: overviewQuery.isLoading || categoriesQuery.isLoading,
    loading:
      createQuestionMutation.isPending ||
      importQuestionsMutation.isPending ||
      reOpenSessionMutation.isPending ||
      blockStudentMutation.isPending ||
      adjustScoreMutation.isPending,

    // Methods
    getCategories: async () => categoriesQuery.data || [],
    createQuestion: (data: CreateQuestionDTO) => createQuestionMutation.mutateAsync(data),
    importQuestionsFromExcel: (categoryId: string, file: File) =>
      importQuestionsMutation.mutateAsync({ categoryId, file }),
    reOpenTestSession: (data: ReOpenSessionDTO) => reOpenSessionMutation.mutateAsync(data),
    blockStudent: (id: string, blocked: boolean) => blockStudentMutation.mutateAsync({ id, blocked }),
    adjustScore: (id: string, amount: number, reason: string) =>
      adjustScoreMutation.mutateAsync({ id, amount, reason }),

    // Original Mutations (React Query metodlari uchun)
    mutations: {
      createQuestion: createQuestionMutation,
      importQuestions: importQuestionsMutation,
      reOpenSession: reOpenSessionMutation,
      blockStudent: blockStudentMutation,
      adjustScore: adjustScoreMutation,
    },
  };
}