// src/pages/admin/AdminTestDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTestDetail,
  usePublishTest,
  useReopenTest,
} from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { AssignTestForm } from '../../../components/admin/tests/AssignTestForm';
import { TestAnalyticsPanel } from '../../../components/admin/tests/TestAnalyticsPanel';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import {
  PageHeader,
  Section,
  CardList,
  EmptyState,
  Field,
  Skeleton,
} from '../../../components/ui';
import {
  Clock,
  Target,
  FileText,
  Rocket,
  AlertTriangle,
  RotateCw,
  Search,
  Check,
} from '../../../design/icons';
import { TEXT, CONTROL, ICON, PAGE_NARROW } from '../../../design/tokens';

type Tab = 'info' | 'assign' | 'analytics' | 'reopen';

export function AdminTestDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm, showBackButton, hideBackButton } =
    useTelegram();

  const { data: test, isLoading } = useTestDetail(id);
  const publishTest = usePublishTest();
  const reopenTest = useReopenTest(id);

  const [tab, setTab] = useState<Tab>('info');
  const [reopenStudentId, setReopenStudentId] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  useEffect(() => {
    const cleanup = showBackButton(() => {
      haptic('light');
      navigate('/teacher/tests');
    });
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  const filteredQuestions = useMemo(() => {
    if (!test?.questions) return [];
    const q = questionSearch.trim().toLowerCase();
    return test.questions.filter((tq: any) =>
      !q || tq.question.text.toLowerCase().includes(q),
    );
  }, [test?.questions, questionSearch]);

  const handlePublish = async () => {
    haptic('medium');
    const ok = await showConfirm(
      "Testni e'lon qilmoqchimisiz? Talabalar uni ko'radi.",
    );
    if (!ok) return;

    publishTest.mutate(test?.id ?? id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "Test e'lon qilindi");
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || 'Xatolik');
      },
    });
  };

  const handleReopen = () => {
    if (!reopenStudentId.trim()) {
      hapticNotify('error');
      toast('error', 'Student ID kiriting');
      return;
    }
    haptic('medium');
    reopenTest.mutate(reopenStudentId.trim(), {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', 'Test qayta ochildi');
        setReopenStudentId('');
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || 'Xatolik');
      },
    });
  };

  if (isLoading || !test) {
    return (
      <div className={PAGE_NARROW}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
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
    <div className={PAGE_NARROW}>
      <PageHeader
        title={test.title}
        subtitle={`${test.questions.length} savol`}
        onBack={() => {
          haptic('light');
          navigate('/teacher/tests');
        }}
        actions={<StatusBadge status={test.status} />}
      />

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2">
        <MetaChip icon={Clock} label={`${Math.round(test.durationSeconds / 60)} daq`} />
        <MetaChip icon={Target} label={`${test.passingScore}%`} />
        <MetaChip icon={FileText} label={`${test.questions.length} savol`} />
      </div>

      {/* Publish */}
      {test.status === 'DRAFT' && (
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishTest.isPending}
          className="w-full bg-teal text-base font-semibold rounded-xl px-5 py-3 text-sm active:scale-[0.98] transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Rocket className="w-4 h-4" />
          {publishTest.isPending ? "E'lon qilinmoqda..." : "E'lon qilish"}
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              haptic('light');
              setTab(t.key);
            }}
            className={`${CONTROL.chip} ${
              tab === t.key ? CONTROL.chipActive : CONTROL.chipInactive
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 opacity-70">· {t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-surface/10 border border-white/5 rounded-2xl p-5">
        {tab === 'info' && (
          <div className="space-y-5">
            <Section
              title="Savollar"
              action={
                test.questions.length > 3 && (
                  <div className="relative w-48">
                    <Search className={`${ICON.xs} absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted`} />
                    <input
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Qidirish..."
                      className={CONTROL.input + ' pl-8 py-1.5 text-xs min-h-[36px]'}
                    />
                  </div>
                )
              }
            >
              {filteredQuestions.length === 0 ? (
                <p className={TEXT.bodySm + ' text-center py-8'}>
                  {questionSearch ? "Topilmadi" : "Savollar yo'q"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredQuestions.map((tq: any, i: number) => {
                    const opts = tq.question.options || tq.question.answers || [];
                    return (
                      <div
                        key={tq.question.id}
                        className="bg-surface/30 border border-white/5 rounded-xl p-3.5 space-y-2"
                      >
                        <p className="text-sm text-ink flex items-start gap-2">
                          <span className="text-ink-muted font-mono shrink-0 text-xs pt-0.5">
                            {i + 1}.
                          </span>
                          <span className="break-words">{tq.question.text}</span>
                        </p>
                        {opts.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                            {opts.map((opt: any, oi: number) => (
                              <div
                                key={oi}
                                className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                                  opt.isCorrect
                                    ? 'bg-teal/10 border-teal/30 text-teal'
                                    : 'bg-surface/30 border-white/5 text-ink-muted'
                                }`}
                              >
                                {opt.isCorrect && <Check className="w-3 h-3 shrink-0" />}
                                <span className="truncate">{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        )}

        {tab === 'assign' && <AssignTestForm testId={test.id} />}
        {tab === 'analytics' && <TestAnalyticsPanel testId={test.id} />}

        {tab === 'reopen' && (
          <div className="space-y-4 max-w-md">
            <div className="bg-surface/40 border border-white/5 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gold" />
                <p className="text-xs font-semibold text-gold">Maxsus qayta ochish</p>
              </div>
              <p className={TEXT.bodySm + ' leading-relaxed'}>
                Test faqat ko'rsatilgan student uchun qayta ochiladi.
              </p>
            </div>

            <Field label="Student ID">
              <input
                value={reopenStudentId}
                onChange={(e) => setReopenStudentId(e.target.value)}
                placeholder="64f8a2b..."
                className={CONTROL.input}
              />
            </Field>

            <button
              type="button"
              onClick={handleReopen}
              disabled={reopenTest.isPending || !reopenStudentId.trim()}
              className={CONTROL.buttonDanger + ' w-full disabled:opacity-50'}
            >
              <RotateCw className="w-4 h-4" />
              {reopenTest.isPending ? 'Ochilmoqda...' : 'Qayta ochish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted bg-surface/40 px-2.5 py-1.5 rounded-lg">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default AdminTestDetail;