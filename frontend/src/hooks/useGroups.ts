// src/hooks/useGroups.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

/* ============================================================
   TYPES
   ============================================================ */
export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  posterUrl?: string | null;
  teacherId?: string | null;
  teacher?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  } | null;
  createdAt: string;
  _count?: {
    students?: number;
    members?: number;
    assignments?: number;
  };
}

export interface TeacherItem {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
}

/* ============================================================
   GROUPS LIST
   ============================================================ */
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiFetch<GroupItem[]>('/api/v1/groups'),
  });
}

/* ============================================================
   GROUP DETAIL
   ============================================================ */
export function useGroup(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => apiFetch<GroupItem>(`/api/v1/groups/${id}`),
    enabled: !!id,
  });
}

/* ============================================================
   GROUP MEMBERS
   ============================================================ */
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => apiFetch<any[]>(`/api/v1/groups/${groupId}/students`),
    enabled: !!groupId,
  });
}

/* ============================================================
   TEACHERS LIST — faqat TEACHER rolidagi userlar
   ============================================================ */
export function useTeachersList() {
  return useQuery({
    queryKey: ['teachers-list'],
    queryFn: async () => {
      const data = await apiFetch<any>('/api/v1/users?role=TEACHER');
      const list = Array.isArray(data)
        ? data
        : data?.items || data?.users || data?.data || [];

      // ✅ Faqat TEACHER rolli userlarni qaytarish
      return list.filter((u: any) => u.role === 'TEACHER') as TeacherItem[];
    },
    staleTime: 60_000,
  });
}

/* ============================================================
   CREATE GROUP
   ============================================================ */
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newGroup: {
      name: string;
      description?: string;
      posterUrl?: string;
      teacherId?: string;
    }) =>
      apiFetch<GroupItem>('/api/v1/groups', {
        method: 'POST',
        data: newGroup,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/* ============================================================
   ADD STUDENT
   ============================================================ */
export function useAddStudentToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      studentId,
    }: {
      groupId: string;
      studentId: string;
    }) =>
      apiFetch(`/api/v1/groups/${groupId}/students`, {
        method: 'POST',
        data: { studentId },
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['group-students', variables.groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/* ============================================================
   REMOVE STUDENT
   ============================================================ */
export function useRemoveStudentFromGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      studentId,
    }: {
      groupId: string;
      studentId: string;
    }) =>
      apiFetch(`/api/v1/groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['group-students', variables.groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/* ============================================================
   ASSIGN TEACHER
   ============================================================ */
export function useAssignGroupTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      teacherId,
    }: {
      groupId: string;
      teacherId: string | null;
    }) =>
      apiFetch(`/api/v1/groups/${groupId}/teacher`, {
        method: 'PATCH',
        data: { teacherId },
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['group', variables.groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/* ============================================================
   DELETE GROUP
   ============================================================ */
export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch(`/api/v1/groups/${groupId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}