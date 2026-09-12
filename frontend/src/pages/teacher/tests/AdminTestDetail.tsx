import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTestDetail,
  usePublishTest,
  useReopenTest,
} from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/admin/content/StatusBadge';
import { AssignTestForm } from '../../../components/admin/tests/AssignTestForm';
import { TestAnalyticsPanel } from '../../../components/admin/tests/TestAnalyticsPanel';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

type Tab = 'info' | 'assign' | 'analytics' | 'reopen';

export function AdminTestDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const {
    haptic,
    hapticNotify,
    showConfirm,
    showBackButton,
    hideBackButton,
  } = useTelegram();

  const { data: test, isLoading } = useTestDetail(id);
  const publishTest = usePublishTest();
  const reopenTest = useReopenTest(id);

  const [tab, setTab] = useState<Tab>('info');
  const [reopenStudentId, setReopenStudentId] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  /* ---------- BackButton ---------- */
  useEffect(() => {
    const handleBack = () => {
      haptic('light');
      navigate('/teacher/tests');
    };
    const cleanup = showBackButton(handleBack);
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Filtered questions (hook rules — useMemo har doim chaqiriladi) ---------- */
  const filteredQuestions = useMemo(() => {
    if (!test?.questions) return [];
    const q = questionSearch.trim().toLowerCase();
    return test.questions.filter((tq: any) =>
      !q || tq.question.text.toLowerCase().includes(q)
    );
  }, [test?.questions, questionSearch]);

  /* ---------- Publish handler ---------- */
  const handlePublish = async () => {
    haptic('medium');
    const confirmed = await showConfirm(
      "Testni e'lon qilmoqchimisiz? Shundan keyin talabalar uni ko'radi."
    );
    if (!confirmed) return;

    publishTest.mutate(test?.id ?? id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "Test e'lon qilindi!");
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || "E'lon qilishda xatolik!");
      },
    });
  };

  /* ---------- Reopen handler ---------- */
  const handleReopen = () => {
    if (!reopenStudentId.trim()) {
      hapticNotify('error');
      toast('error', 'Student ID kiriting!');
      return;
    }
    haptic('medium');
    reopenTest.mutate(reopenStudentId.trim(), {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', 'Test muvaffaqiyatli qayta ochildi');
        setReopenStudentId('');
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || 'Xatolik yuz berdi');
      },
    });
  };

  /* ---------- Loading ---------- */
  if (isLoading || !test) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-28 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
        <div className="h-64 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'info', label: "Ma'lumot", count: test.questions.length },
    { key: 'assign', label: 'Biriktirish', count: test.assignments?.length },
    { key: 'analytics', label: 'Analitika' },
    { key: 'reopen', label: 'Qayta ochish' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-32">
      {/* ========== HEADER ========== */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/teacher/tests');
            }}
            className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 shrink-0 min-h-[40px]"
          >
            ← Orqaga
          </button>
          <StatusBadge status={test.status} />
        </div>

        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {test.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5 bg-surface/40 px-2.5 py-1.5 rounded-lg">
            ⏱️ {Math.round(test.durationSeconds / 60)} daqiqa
          </span>
          <span className="flex items-center gap-1.5 bg-surface/40 px-2.5 py-1.5 rounded-lg">
            🎯 O'tish: <strong className="text-ink">{test.passingScore}%</strong>
          </span>
          <span className="flex items-center gap-1.5 bg-surface/40 px-2.5 py-1.5 rounded-lg">
            ❓ <strong className="text-ink">{test.questions.length}</strong> savol
          </span>
        </div>

        {test.status === 'DRAFT' && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishTest.isPending}
            className="w-full rounded-2xl bg-teal text-base font-semibold px-5 py-3.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {publishTest.isPending ? "E'lon qilinmoqda..." : "🚀 Testni e'lon qilish"}
          </button>
        )}
      </div>

      {/* ========== TABS ========== */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              haptic('light');
              setTab(t.key);
            }}
            className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-2 min-h-[40px] ${
              tab === t.key
                ? 'bg-gold text-base'
                : 'bg-white/5 text-ink-muted hover:bg-white/10'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-black/20' : 'bg-surface'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========== TAB CONTENT ========== */}
      <div className="bg-surface/10 rounded-3xl border border-white/5 p-5 sm:p-6">
        {tab === 'info' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Savollar ro'yxati</p>
              {test.questions.length > 3 && (
                <input
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="🔍 Qidirish..."
                  className="bg-surface rounded-2xl px-4 py-2.5 text-xs outline-none border border-white/5 text-ink focus:border-gold/50 sm:w-64 min-h-[40px]"
                />
              )}
            </div>

            {filteredQuestions.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8">
                {questionSearch ? "Qidiruvga mos savol yo'q." : "Savollar yo'q."}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((tq: any, i: number) => {
                  const options = tq.question.options || tq.question.answers || [];
                  return (
                    <div
                      key={tq.question.id}
                      className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-2"
                    >
                      <p className="text-sm font-medium text-ink flex items-start gap-2">
                        <span className="text-ink-muted font-mono shrink-0">
                          {i + 1}.
                        </span>
                        <span className="break-words">{tq.question.text}</span>
                      </p>
                      {options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-6">
                          {options.map((opt: any, optIdx: number) => (
                            <div
                              key={optIdx}
                              className={`text-xs px-3 py-2 rounded-xl border ${
                                opt.isCorrect
                                  ? 'bg-teal/10 border-teal/30 text-teal font-medium'
                                  : 'bg-surface/30 border-white/5 text-ink-muted'
                              }`}
                            >
                              {opt.text} {opt.isCorrect && '✓'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {test.assignments && test.assignments.length > 0 && (
              <div className="pt-5 border-t border-white/5 space-y-3">
                <p className="text-sm font-semibold text-ink">
                  Biriktirilganlar tarixi
                </p>
                <div className="space-y-2">
                  {test.assignments.map((a: any) => (
                    <div
                      key={a.id}
                      className="py-2.5 px-3 text-xs flex items-center justify-between bg-surface/30 rounded-xl"
                    >
                      <span className="font-medium text-ink">
                        {a.targetType === 'GROUP' && a.group
                          ? `Guruh: ${a.group.name}`
                          : a.targetType}
                      </span>
                      <span className="text-ink-muted">
                        {new Date(a.assignedAt).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'assign' && <AssignTestForm testId={test.id} />}

        {tab === 'analytics' && <TestAnalyticsPanel testId={test.id} />}

        {tab === 'reopen' && (
          <div className="space-y-4 max-w-md">
            <div className="p-4 rounded-2xl bg-surface/50 border border-white/5 space-y-1.5">
              <p className="text-xs font-semibold text-gold flex items-center gap-1.5">
                ⚠️ Maxsus qayta ochish
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Test faqat ko'rsatilgan student uchun qayta ochiladi va boshqa
                talabalarga ta'sir qilmaydi.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Student ID
              </label>
              <input
                value={reopenStudentId}
                onChange={(e) => setReopenStudentId(e.target.value)}
                placeholder="Masalan: 64f8a2b..."
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </div>

            <button
              type="button"
              onClick={handleReopen}
              disabled={reopenTest.isPending || !reopenStudentId.trim()}
              className="w-full rounded-2xl bg-coral/20 text-coral font-semibold px-5 py-3.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {reopenTest.isPending ? 'Ochilmoqda...' : 'Testni qayta ochish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTestDetail;