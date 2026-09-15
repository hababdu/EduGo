// src/hooks/useTeacherAssignments.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { toast } from '../components/ui/Toast';

/* ============================================================
   TYPES
   ============================================================ */
export type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';
export type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';

export interface AssignmentTestItem {
  id?: string;
  question: string;
  options: string[];
  correctOption: number;
  order?: number;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description?: string | null;
  type: ContentType;
  category: AssignmentCategory;
  mediaUrl?: string | null;
  groupId: string;
  teacherId?: string;
  createdAt: string;
  updatedAt?: string;
  group?: { id: string; name: string } | null;
  tests?: AssignmentTestItem[];
}

export interface TeacherGroup {
  id: string;
  name: string;
  description?: string | null;
  teacherId?: string | null;
  _count?: {
    members?: number;
    assignments?: number;
  };
}

export interface CreateAssignmentPayload {
  title: string;
  description?: string;
  type: ContentType;
  category: AssignmentCategory;
  mediaUrl?: string;
  groupId: string;
  tests?: { question: string; options: string[]; correctOption: number }[];
}

export interface UpdateAssignmentPayload {
  title?: string;
  description?: string;
  type?: ContentType;
  category?: AssignmentCategory;
  mediaUrl?: string;
  groupId?: string;
  tests?: { question: string; options: string[]; correctOption: number }[];
}

/* ============================================================
   GROUPS
   ============================================================ */
export function useTeacherGroups() {
  return useQuery({
    queryKey: ['teacher', 'groups'],
    queryFn: () => apiFetch<TeacherGroup[]>('/api/v1/teacher/groups'),
    staleTime: 60_000,
  });
}

export function useTeacherGroup(groupId: string) {
  return useQuery({
    queryKey: ['teacher', 'groups', groupId],
    queryFn: () => apiFetch<any>(`/api/v1/teacher/groups/${groupId}`),
    enabled: !!groupId,
  });
}

/* ============================================================
   ASSIGNMENTS — LIST (groupId bilan)
   ============================================================ */
export function useTeacherAssignments(groupId?: string) {
  const params = groupId ? `?groupId=${groupId}` : '';

  return useQuery({
    queryKey: ['teacher', 'assignments', groupId ?? 'all'],
    queryFn: () =>
      apiFetch<AssignmentItem[]>(
        `/api/v1/teacher/assignments${params}`,
      ),
    staleTime: 30_000,
  });
}

export function useTeacherAssignment(id: string) {
  return useQuery({
    queryKey: ['teacher', 'assignments', 'detail', id],
    queryFn: () =>
      apiFetch<AssignmentItem>(`/api/v1/teacher/assignments/${id}`),
    enabled: !!id,
  });
}

/* ============================================================
   ASSIGNMENTS — MUTATIONS
   ============================================================ */
export function useCreateTeacherAssignment() {
  const qc = useQueryClient();

  return useMutation<AssignmentItem, Error, CreateAssignmentPayload>({
    mutationFn: (data) =>
      apiFetch<AssignmentItem>('/api/v1/teacher/assignments', {
        method: 'POST',
        data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'groups'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
      toast('success', 'Material muvaffaqiyatli saqlandi!');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Saqlashda xatolik';
      toast('error', Array.isArray(msg) ? msg[0] : msg);
    },
  });
}

export function useUpdateTeacherAssignment(id: string) {
  const qc = useQueryClient();

  return useMutation<AssignmentItem, Error, UpdateAssignmentPayload>({
    mutationFn: (data) =>
      apiFetch<AssignmentItem>(`/api/v1/teacher/assignments/${id}`, {
        method: 'PATCH',
        data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'groups'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
      toast('success', "O'zgarishlar saqlandi!");
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Yangilashda xatolik';
      toast('error', Array.isArray(msg) ? msg[0] : msg);
    },
  });
}

export function useDeleteTeacherAssignment() {
  const qc = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id) =>
      apiFetch<{ ok: boolean }>(`/api/v1/teacher/assignments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'groups'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
      toast('success', "Material o'chirildi!");
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "O'chirishda xatolik";
      toast('error', Array.isArray(msg) ? msg[0] : msg);
    },
  });
}