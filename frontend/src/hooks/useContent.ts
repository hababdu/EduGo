import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface ContentItem {
  id: string;
  title: string;
  description?: string | null;
  posterUrl?: string | null;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  order?: number;
  sequentialLocked?: boolean;
  [key: string]: unknown;
}

// ---------- COURSES ----------

export function useCourses() {
  return useQuery({
    queryKey: ['content', 'courses'],
    queryFn: () => apiFetch<ContentItem[]>('/api/v1/courses'),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['content', 'courses', id],
    queryFn: () => apiFetch<ContentItem>(`/api/v1/courses/${id}`),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      apiFetch('/api/v1/courses', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'courses'] }),
  });
}

export function useUpdateCourse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContentItem>) =>
      apiFetch(`/api/v1/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'courses'] });
      qc.invalidateQueries({ queryKey: ['content', 'courses', id] });
    },
  });
}

// ---------- SUBJECTS ----------

export function useSubjects(courseId: string) {
  return useQuery({
    queryKey: ['content', 'subjects', courseId],
    queryFn: () => apiFetch<ContentItem[]>(`/api/v1/subjects?courseId=${courseId}`),
    enabled: !!courseId,
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ['content', 'subject', id],
    queryFn: () => apiFetch<ContentItem>(`/api/v1/subjects/${id}`),
    enabled: !!id,
  });
}

export function useCreateSubject(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      apiFetch('/api/v1/subjects', { method: 'POST', body: JSON.stringify({ ...data, courseId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'subjects', courseId] }),
  });
}

export function useUpdateSubject(id: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContentItem>) =>
      apiFetch(`/api/v1/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'subjects', courseId] });
      qc.invalidateQueries({ queryKey: ['content', 'subject', id] });
    },
  });
}

// ---------- SECTIONS ----------

export function useSections(subjectId: string) {
  return useQuery({
    queryKey: ['content', 'sections', subjectId],
    queryFn: () => apiFetch<ContentItem[]>(`/api/v1/sections?subjectId=${subjectId}`),
    enabled: !!subjectId,
  });
}

export function useSection(id: string) {
  return useQuery({
    queryKey: ['content', 'section', id],
    queryFn: () => apiFetch<ContentItem>(`/api/v1/sections/${id}`),
    enabled: !!id,
  });
}

export function useCreateSection(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      apiFetch('/api/v1/sections', { method: 'POST', body: JSON.stringify({ ...data, subjectId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'sections', subjectId] }),
  });
}

export function useUpdateSection(id: string, subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContentItem>) =>
      apiFetch(`/api/v1/sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'sections', subjectId] });
      qc.invalidateQueries({ queryKey: ['content', 'section', id] });
    },
  });
}

// ---------- TOPICS ----------

export function useTopics(sectionId: string) {
  return useQuery({
    queryKey: ['content', 'topics', sectionId],
    queryFn: () => apiFetch<ContentItem[]>(`/api/v1/topics?sectionId=${sectionId}`),
    enabled: !!sectionId,
  });
}

export function useTopic(id: string) {
  return useQuery({
    queryKey: ['content', 'topic', id],
    queryFn: () => apiFetch<ContentItem>(`/api/v1/topics/${id}`),
    enabled: !!id,
  });
}

export function useCreateTopic(sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; sequentialLocked?: boolean }) =>
      apiFetch('/api/v1/topics', { method: 'POST', body: JSON.stringify({ ...data, sectionId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'topics', sectionId] }),
  });
}

export function useUpdateTopic(id: string, sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContentItem>) =>
      apiFetch(`/api/v1/topics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'topics', sectionId] });
      qc.invalidateQueries({ queryKey: ['content', 'topic', id] });
    },
  });
}

// ---------- LESSONS ----------

export interface LessonItem {
  id: string;
  title: string;
  order: number;
  videos: { id: string; source: string; url: string }[];
  materials: { id: string; type: string; fileUrl: string; title: string }[];
}

export function useLessons(topicId: string) {
  return useQuery({
    queryKey: ['content', 'lessons', topicId],
    queryFn: () => apiFetch<LessonItem[]>(`/api/v1/lessons?topicId=${topicId}`),
    enabled: !!topicId,
  });
}

export function useCreateLesson(topicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) =>
      apiFetch('/api/v1/lessons', { method: 'POST', body: JSON.stringify({ ...data, topicId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'lessons', topicId] }),
  });
}

export function useAddVideo(topicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, url, source }: { lessonId: string; url: string; source: string }) =>
      apiFetch(`/api/v1/lessons/${lessonId}/videos`, {
        method: 'POST',
        body: JSON.stringify({ url, source }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'lessons', topicId] }),
  });
}

export function useAddMaterial(topicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, fileUrl, title, type }: { lessonId: string; fileUrl: string; title: string; type: string }) =>
      apiFetch(`/api/v1/lessons/${lessonId}/materials`, {
        method: 'POST',
        body: JSON.stringify({ fileUrl, title, type }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'lessons', topicId] }),
  });
}
