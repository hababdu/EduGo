import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api-client';

export interface TestQuestionOption {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT_ANSWER';
  text: string;
  points: number;
  options: TestQuestionOption[];
}

export interface TestSessionData {
  sessionId: string;
  testTitle: string;
  remainingSeconds: number;
  questions: TestQuestion[];
  savedAnswers?: { questionId: string; selectedOptionIds: string[]; textAnswer: string | null }[];
}

export interface SubmitResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  autoSubmitted: boolean;
}

/**
 * Test topshirish oqimining butun mantig'i shu yerda.
 * MUHIM: `remainingSeconds` faqat SERVERDAN keladi — frontend hech qachon
 * o'zi vaqtni "hisoblab chiqarmaydi", faqat serverdan olingan qiymatdan
 * lokal countdown yuritadi va muntazam serverdan qayta tasdiqlaydi.
 */
export function useTestSession(testId: string) {
  const [session, setSession] = useState<TestSessionData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState<'loading' | 'active' | 'submitted' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    apiFetch<TestSessionData>(`/api/v1/tests/${testId}/start`, { method: 'POST' })
      .then((data) => {
        setSession(data);
        setRemaining(data.remainingSeconds);
        const initial: Record<string, string[]> = {};
        data.savedAnswers?.forEach((a) => {
          initial[a.questionId] = a.selectedOptionIds;
        });
        setAnswers(initial);
        setStatus('active');
      })
      .catch((err) => {
        setErrorMessage(err.message ?? 'Testni boshlab bo\'lmadi');
        setStatus('error');
      });
  }, [testId]);

  // Lokal countdown — faqat KO'RSATISH uchun, hisob-kitob uchun EMAS
  useEffect(() => {
    if (status !== 'active') return;
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Har 20 soniyada serverdan haqiqiy vaqtni qayta tasdiqlaymiz
  useEffect(() => {
    if (status !== 'active') return;
    const interval = setInterval(async () => {
      try {
        const fresh = await apiFetch<TestSessionData>(`/api/v1/tests/${testId}/session`);
        setRemaining(fresh.remainingSeconds);
      } catch {
        // Sessiya tugagan bo'lishi mumkin — submit() o'zi keyingi urinishda buni ushlaydi
      }
    }, 20_000);
    return () => clearInterval(interval);
  }, [status, testId]);

  const selectAnswer = useCallback(
    (questionId: string, optionIds: string[]) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionIds }));
      // 23-band: auto-save — har javobda darhol serverga yuboriladi
      apiFetch(`/api/v1/tests/${testId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOptionIds: optionIds }),
      }).catch(() => {
        /* tarmoq xatosi — keyingi urinishda qayta yuboriladi, javob lokal state'da saqlangan */
      });
    },
    [testId],
  );

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const res = await apiFetch<SubmitResult>(`/api/v1/tests/${testId}/submit`, {
        method: 'POST',
      });
      setResult(res);
      setStatus('submitted');
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Yuborishda xatolik');
      setStatus('error');
    } finally {
      submittingRef.current = false;
    }
  }, [testId]);

  // Vaqt tugaganda avtomatik submit
  useEffect(() => {
    if (status === 'active' && remaining === 0) {
      submit();
    }
  }, [remaining, status, submit]);

  return { session, answers, remaining, status, errorMessage, result, selectAnswer, submit };
}
