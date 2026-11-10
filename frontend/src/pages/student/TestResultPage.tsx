// Tugatilgan test natijasi: /tests/:testId/result
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';

interface AssignedTest {
  testId: string;
  title: string;
  status: 'PENDING' | 'COMPLETED' | 'RETAKE_AVAILABLE';
  score?: number;
  maxScore?: number;
  passed?: boolean;
}

export function TestResultPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'assigned-tests'],
    queryFn: () => apiFetch<AssignedTest[]>('/api/v1/tests/assigned/me'),
    staleTime: 30_000,
  });
  const t = data?.find((x) => x.testId === testId);

  if (isLoading) return <div className="p-4 max-w-md mx-auto"><div className="h-48 rounded-3xl bg-surface/30 animate-pulse" /></div>;

  if (!t || t.score === undefined || t.maxScore === undefined) {
    return (
      <div className="p-4 max-w-md mx-auto pb-24 text-center space-y-3">
        <p className="text-ink-faint text-sm">Bu test uchun natija topilmadi.</p>
        <button onClick={() => navigate('/tests')} className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold">Testlarga qaytish</button>
      </div>
    );
  }

  const percent = t.maxScore > 0 ? Math.round((t.score / t.maxScore) * 100) : 0;
  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="rounded-3xl bg-surface/40 border border-tint/10 p-6 text-center">
        <p className="text-xs text-ink-faint mb-1">{t.title}</p>
        <p className={`font-display text-5xl font-extrabold ${t.passed ? 'text-teal' : 'text-coral'}`}>{percent}%</p>
        <p className="text-sm text-ink-faint mt-1">{t.score}/{t.maxScore} ball</p>
        <p className={`mt-3 font-semibold ${t.passed ? 'text-teal' : 'text-coral'}`}>{t.passed ? "🎉 O'tdingiz!" : "📚 O'ta olmadingiz"}</p>
        {t.status === 'RETAKE_AVAILABLE' && (
          <button onClick={() => navigate(`/tests/${t.testId}`)} className="mt-4 w-full rounded-2xl bg-sky-500/20 text-sky-400 py-3 text-sm font-semibold">🔁 Qayta topshirish</button>
        )}
        <button onClick={() => navigate('/tests')} className="mt-3 w-full rounded-2xl bg-accent py-3 text-sm font-semibold">Testlarga qaytish</button>
      </div>
    </div>
  );
}
