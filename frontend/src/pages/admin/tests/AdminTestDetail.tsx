import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestDetail, usePublishTest, useReopenTest } from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/admin/content/StatusBadge';
import { AssignTestForm } from '../../../components/admin/tests/AssignTestForm';
import { TestAnalyticsPanel } from '../../../components/admin/tests/TestAnalyticsPanel';

type Tab = 'info' | 'assign' | 'analytics' | 'reopen';

export function AdminTestDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: test, isLoading } = useTestDetail(id);
  const publishTest = usePublishTest();
  const reopenTest = useReopenTest(id);
  const [tab, setTab] = useState<Tab>('info');
  const [reopenStudentId, setReopenStudentId] = useState('');
  const [reopenMessage, setReopenMessage] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');

  if (isLoading || !test) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-surface/50 rounded-xl animate-pulse" />
        <div className="h-28 bg-surface/50 rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'info', label: "Ma'lumot", count: test.questions.length },
    { key: 'assign', label: 'Biriktirish', count: test.assignments?.length },
    { key: 'analytics', label: 'Analitika' },
    { key: 'reopen', label: 'Qayta ochish' },
  ];

  const filteredQuestions = test.questions.filter((tq: any) =>
    tq.question.text.toLowerCase().includes(questionSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Orqaga tugmasi */}
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors bg-surface/30 px-3 py-1.5 rounded-xl border border-white/5 w-fit"
      >
        ← Orqaga qaytish
      </button>

      {/* Sarlavha va status */}
      <div className="bg-surface/20 p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-ink">{test.title}</h1>
          <StatusBadge status={test.status} />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted pt-2 border-t border-white/5">
          <span className="flex items-center gap-1.5">
            ⏱️ {Math.round(test.durationSeconds / 60)} daqiqa
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            🎯 O'tish balli: <strong className="text-ink">{test.passingScore}%</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            ❓ Jami savollar: <strong className="text-ink">{test.questions.length} ta</strong>
          </span>
        </div>

        {test.status === 'DRAFT' && (
          <div className="pt-2">
            <button
              onClick={() => publishTest.mutate(test.id)}
              disabled={publishTest.isPending}
              className="rounded-xl bg-teal text-base font-semibold px-5 py-2.5 text-xs hover:opacity-90 transition-opacity disabled:opacity-50 text-base"
            >
              {publishTest.isPending ? "E'lon qilinmoqda..." : "🚀 Testni e'lon qilish"}
            </button>
          </div>
        )}
      </div>

      {/* Navigatsiya Tablar */}
      <div className="flex gap-2 border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'border-gold text-gold bg-surface/20 rounded-t-xl'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded-full text-ink-muted">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Kontentlari */}
      <div className="bg-surface/10 rounded-2xl border border-white/5 p-6">
        {tab === 'info' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">Savollar ro'yxati</p>
              {test.questions.length > 3 && (
                <input
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="Savollar orasidan qidirish..."
                  className="bg-surface rounded-xl px-3 py-1.5 text-xs placeholder:text-ink-faint outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold sm:w-64"
                />
              )}
            </div>

            {filteredQuestions.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8">Savollar topilmadi.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredQuestions.map((tq: any, i: number) => {
                  const options = tq.question.options || tq.question.answers || [];
                  return (
                    <div key={tq.question.id} className="py-3.5 text-sm space-y-1">
                      <p className="font-medium text-ink flex items-start gap-2">
                        <span className="text-ink-muted font-mono">{i + 1}.</span>
                        <span>{tq.question.text}</span>
                      </p>
                      {options.length > 0 && (
                        <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {options.map((opt: any, optIdx: number) => (
                            <div
                              key={optIdx}
                              className={`text-xs px-3 py-1.5 rounded-lg border ${
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
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-sm font-medium text-ink mb-3">Biriktirilganlar tarixi</p>
                <div className="divide-y divide-white/5">
                  {test.assignments.map((a: any) => (
                    <div key={a.id} className="py-2.5 text-xs flex items-center justify-between">
                      <span className="font-medium text-ink">
                        {a.targetType === 'GROUP' && a.group ? `Guruh: ${a.group.name}` : a.targetType}
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
            <div className="p-4 rounded-xl bg-surface/50 border border-white/5 space-y-1">
              <p className="text-xs font-medium text-gold">⚠️ Maxsus qayta ochish</p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Test faqat ko'rsatilgan student uchun qayta ochiladi va boshqa talabalarga ta'sir qilmaydi.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-ink-muted">Student ID raqami</label>
              <input
                value={reopenStudentId}
                onChange={(e) => setReopenStudentId(e.target.value)}
                placeholder="Masalan: 64f8a2b..."
                className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
              />
            </div>
            <button
              onClick={() =>
                reopenTest.mutate(reopenStudentId, {
                  onSuccess: () => setReopenMessage('✅ Test muvaffaqiyatli qayta ochildi'),
                  onError: (err: any) => setReopenMessage(`❌ ${err.message ?? 'Xatolik yuz berdi'}`),
                })
              }
              disabled={reopenTest.isPending || !reopenStudentId.trim()}
              className="rounded-xl bg-coral/20 text-coral font-semibold px-5 py-2.5 text-xs hover:bg-coral/30 transition-colors disabled:opacity-50"
            >
              {reopenTest.isPending ? 'Ochilmoqda...' : 'Testni qayta ochish'}
            </button>
            {reopenMessage && (
              <p className={`text-xs font-medium p-3 rounded-xl ${reopenMessage.startsWith('✅') ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'}`}>
                {reopenMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}