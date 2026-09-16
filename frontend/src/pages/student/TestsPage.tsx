// src/pages/student/TestsPage.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

type TestStatus = 'PENDING' | 'COMPLETED' | 'RETAKE_AVAILABLE';

interface AssignedTest {
  testId: string;
  title: string;
  durationSeconds: number;
  deadline?: string | null;
  status: TestStatus;
  score?: number;
  maxScore?: number;
  passed?: boolean;
}

function useAssignedTests() {
  return useQuery({
    queryKey: ['student', 'assigned-tests'],
    queryFn: () => apiFetch<AssignedTest[]>('/api/v1/tests/assigned/me'),
    staleTime: 30_000,
  });
}

export function TestsPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data: tests, isLoading, error } = useAssignedTests();
  const [filter, setFilter] = useState<'ALL' | TestStatus>('ALL');

  const filtered = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) =>
      filter === 'ALL' ? true : t.status === filter,
    );
  }, [tests, filter]);

  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-24">
        <div className="h-20 bg-surface/30 rounded-3xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-ink">Xatolik</p>
          <p className="text-xs text-ink-muted mt-2">
            {(error as any)?.message || "Server bilan bog'lanishda muammo"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <h1 className="font-display text-xl sm:text-2xl text-ink">Testlarim</h1>
        <p className="text-xs text-ink-muted mt-1">
          {tests ? `Jami: ${tests.length} ta test` : 'Yuklanmoqda...'}
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { key: 'ALL', label: 'Barchasi' },
          { key: 'PENDING', label: '🟡 Kutilmoqda' },
          { key: 'COMPLETED', label: '✅ Tugatilgan' },
          { key: 'RETAKE_AVAILABLE', label: '🔁 Qayta' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              haptic('light');
              setFilter(key as any);
            }}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
              filter === key
                ? 'bg-gold text-base'
                : 'bg-white/5 text-ink-muted hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-ink">
            {tests?.length === 0
              ? "Sizga hali test biriktirilmagan"
              : 'Bu filtrga mos test yo\'q'}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {tests?.length === 0
              ? "O'qituvchi test biriktirgach bu yerda ko'rinadi"
              : "Boshqa filtrni sinab ko'ring"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const isCompleted = t.status === 'COMPLETED';
            const isPending = t.status === 'PENDING';
            const isRetake = t.status === 'RETAKE_AVAILABLE';

            const badge = isPending
              ? { label: '🟡 Kutilmoqda', color: 'bg-gold/15 text-gold' }
              : isCompleted
              ? {
                  label: t.passed ? '✅ O\'tildi' : '❌ O\'tilmadi',
                  color: t.passed
                    ? 'bg-teal/15 text-teal'
                    : 'bg-red-500/15 text-red-400',
                }
              : { label: '🔁 Qayta topshirish', color: 'bg-sky-500/15 text-sky-400' };

            return (
              <button
                key={t.testId}
                type="button"
                onClick={() => {
                  haptic('light');
                  if (isPending || isRetake) {
                    navigate(`/tests/${t.testId}`);
                  } else {
                    // Tugatilgan — natijani ko'rsatish
                    navigate(`/tests/${t.testId}/result`);
                  }
                }}
                className="w-full text-left bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-ink truncate">
                      {t.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-ink-muted mt-1">
                      <span>⏱️ {Math.round(t.durationSeconds / 60)} daq</span>
                      {t.deadline && (
                        <span>
                          ⏰ {new Date(t.deadline).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                    </div>
                    {isCompleted && t.score !== undefined && t.maxScore !== undefined && (
                      <p className="text-xs text-ink-muted mt-1">
                        Ball:{' '}
                        <span className={t.passed ? 'text-teal font-semibold' : 'text-red-400 font-semibold'}>
                          {t.score}/{t.maxScore}
                        </span>
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TestsPage;