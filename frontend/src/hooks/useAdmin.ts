import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import type { 
  AdminOverview, 
  AdminStudentListResponse, 
  TeacherItem, 
  GroupItem, 
  SubjectItem 
} from '../types/admin';

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverview>('/api/v1/admin/overview'),
    staleTime: 60_000,
  });
}

// Studentlar ro'yxati
export function useAdminStudents(params: { search?: string; status?: string; group_id?: string; page: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.group_id) query.set('group_id', params.group_id);
  query.set('page', String(params.page));

  return useQuery({
    queryKey: ['admin', 'students', params],
    queryFn: () => apiFetch<AdminStudentListResponse>(`/api/v1/admin/students?${query.toString()}`),
    placeholderData: (prev) => prev,
  });
}

// Student ma'lumotlari
export function useAdminStudentDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'students', id],
    queryFn: () => apiFetch<any>(`/api/v1/admin/students/${id}`),
    enabled: !!id,
  });
}

// O'qituvchilar ro'yxati
export function useAdminTeachers() {
  return useQuery({
    queryKey: ['admin', 'teachers'],
    queryFn: () => apiFetch<TeacherItem[]>('/api/v1/admin/teachers'),
  });
}

// Guruhlar ro'yxati
export function useAdminGroups() {
  return useQuery({
    queryKey: ['admin', 'groups'],
    queryFn: () => apiFetch<GroupItem[]>('/api/v1/admin/groups'),
  });
}

// Fanlar ro'yxati
export function useAdminSubjects() {
  return useQuery({
    queryKey: ['admin', 'subjects'],
    queryFn: () => apiFetch<SubjectItem[]>('/api/v1/admin/subjects'),
  });
}

// MUTATIONS

// Rolni o'zgartirish (O'qituvchi tayinlash)
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'STUDENT' | 'TEACHER' | 'ADMIN' }) =>
      apiFetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// Yangi guruh yaratish
export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; teacherId?: string }) =>
      apiFetch('/api/v1/admin/groups', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
    },
  });
}

// Studentni guruhga biriktirish
export function useAssignStudentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, groupId }: { studentId: string; groupId: string | null }) =>
      apiFetch(`/api/v1/admin/students/${studentId}/group`, {
        method: 'PATCH',
        body: JSON.stringify({ groupId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
    },
  });
}

// Yangi fan yaratish
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; code: string }) =>
      apiFetch('/api/v1/admin/subjects', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] });
    },
  });
}

// O'qituvchiga fan biriktirish
export function useAssignTeacherSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, subjectId }: { teacherId: string; subjectId: string }) =>
      apiFetch(`/api/v1/admin/teachers/${teacherId}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subjectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teachers'] });
    },
  });
}

// Block/Unblock
export function useBlockStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      apiFetch(`/api/v1/admin/students/${id}/${blocked ? 'block' : 'unblock'}`, {
        method: 'PATCH',
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', variables.id] });
    },
  });
}

// Score o'zgartirish
export function useAdjustScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason: string }) =>
      apiFetch(`/api/v1/admin/students/${id}/score`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, reason }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', variables.id] });
    },
  });
}