import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { CourseDTO, SubjectDTO, LessonDTO } from '../types/lms';

export function useLms() {
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Barcha aktiv kurslarni yuklash
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<CourseDTO[]>('/api/v1/courses');
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Kurslarni yuklashda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Fan tafsilotlarini iyerarxiyasi bilan olish
  const getSubjectDetails = async (subjectId: string): Promise<SubjectDTO | null> => {
    try {
      return await apiClient.get<SubjectDTO>(`/api/v1/subjects/${subjectId}`);
    } catch (err: any) {
      setError(err.message || 'Fan ma\'lumotlarini yuklashda xatolik');
      return null;
    }
  };

  // 3. Dars ma'lumotlarini yuklash
  const getLessonDetails = async (lessonId: string): Promise<LessonDTO | null> => {
    try {
      return await apiClient.get<LessonDTO>(`/api/v1/lessons/${lessonId}`);
    } catch (err: any) {
      setError(err.message || 'Darsni yuklashda xatolik');
      return null;
    }
  };

  // 4. Video tomosha qilish progressini backendga yuborish
  const updateVideoProgress = async (videoId: string, percent: number) => {
    try {
      await apiClient.post(`/api/v1/videos/${videoId}/progress`, { percent });
    } catch (err: any) {
      console.error('Progressni saqlashda xatolik:', err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    isLoading,
    error,
    getSubjectDetails,
    getLessonDetails,
    updateVideoProgress,
  };
}