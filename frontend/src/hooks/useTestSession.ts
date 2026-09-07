import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';
import { TestSessionDTO, SubmitTestResponseDTO } from '../types/test';

export function useTestSession(testId: string) {
  const [session, setSession] = useState<TestSessionDTO | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds: string[]; textAnswer?: string }>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<SubmitTestResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Session'ni yuklash yoki yangi boshlash
  const fetchOrStartSession = useCallback(async () => {
    try {
      setIsLoading(true);
      // apiFetch o'rniga apiClient, va /api/v1 prefiksi bilan
      const sessionData = await apiClient.post<TestSessionDTO>(`/api/v1/tests/${testId}/start`);

      setSession(sessionData);
      setAnswers(sessionData.savedAnswers || {});

      // Server-side timerni hisoblash
      const startTime = new Date(sessionData.startedAt).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remainingSeconds = sessionData.durationSeconds - elapsedSeconds;

      setTimeLeft(remainingSeconds > 0 ? remainingSeconds : 0);
    } catch (err: any) {
      setError(err.message || 'Test sessiyasini boshlashda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchOrStartSession();
  }, [fetchOrStartSession]);

  // 2. CountDown Timer (Server vaqtiga asoslangan)
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          submitTest(true); // Vaqt tugaganda majburiy Submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result]);

  // 3. Javoblarni auto-save qilish (Debounce bilan)
  const saveAnswerLocally = (questionId: string, selectedOptionIds: string[], textAnswer?: string) => {
    const updatedAnswers = {
      ...answers,
      [questionId]: { selectedOptionIds, textAnswer },
    };
    setAnswers(updatedAnswers);

    // Debounce bilan backendga saqlash
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!session) return;
      apiClient.post(`/api/v1/tests/sessions/${session.id}/save-answer`, {
        questionId,
        selectedOptionIds,
        textAnswer,
      }).catch(console.error);
    }, 800);
  };

  // 4. Testni yakunlash (Submit)
  const submitTest = async (isAutoSubmit = false) => {
    if (!session || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const resultData = await apiClient.post<SubmitTestResponseDTO>(`/api/v1/tests/sessions/${session.id}/submit`, {
        answers,
        isAutoSubmit,
      });
      setResult(resultData);
    } catch (err: any) {
      setError(err.message || 'Testni yakunlashda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    session,
    answers,
    timeLeft,
    isLoading,
    isSubmitting,
    result,
    error,
    saveAnswerLocally,
    submitTest,
  };
}