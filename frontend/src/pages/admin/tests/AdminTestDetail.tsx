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

  if (isLoading || !test) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Ma\'lumot' },
    { key: 'assign', label: 'Biriktirish' },
    { key: 'analytics', label: 'Analitika' },
    { key: 'reopen', label: 'Qayta ochish' },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-6">
        ← Orqaga
      </button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl">{test.title}</h1>
        <StatusBadge status={test.status} />
      </div>
      <p className="text-sm text-ink-muted mb-6">
        {Math.round(test.durationSeconds / 60)} daqiqa · O'tish balli: {test.passingScore}% ·{' '}
        {test.questions.length} savol
      </p>

      {test.status === 'DRAFT' && (
        <button
          onClick={() => publishTest.mutate(test.id)}
          disabled={publishTest.isPending}
          className="mb-6 rounded-full bg-teal text-base font-semibold px-5 py-2 text-sm disabled:opacity-50"
        >
          {publishTest.isPending ? "E'lon qilinmoqda..." : "E'lon qilish"}
        </button>
      )}

      <div className="flex gap-1 border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm border-b-2 -mb-px shrink-0 ${
              tab === t.key ? 'border-gold text-ink' : 'border-transparent text-ink-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div>
          <p className="text-sm text-ink-muted mb-3">Savollar ro'yxati</p>
          <div className="divide-y divide-white/5">
            {test.questions.map((tq, i) => (
              <p key={tq.question.id} className="py-2.5 text-sm">
                {i + 1}. {tq.question.text}
              </p>
            ))}
          </div>

          {test.assignments.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-ink-muted mb-3">Biriktirilganlar tarixi</p>
              <div className="divide-y divide-white/5">
                {test.assignments.map((a) => (
                  <p key={a.id} className="py-2 text-sm">
                    {a.targetType === 'GROUP' && a.group ? a.group.name : a.targetType} —{' '}
                    {new Date(a.assignedAt).toLocaleDateString('uz-UZ')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'assign' && <AssignTestForm testId={test.id} />}

      {tab === 'analytics' && <TestAnalyticsPanel testId={test.id} />}

      {tab === 'reopen' && (
        <div className="rounded-xl bg-surface p-4 space-y-3">
          <p className="text-xs text-ink-muted">
            26-band: Test faqat KO'RSATILGAN student uchun qayta ochiladi, boshqalarga ta'sir qilmaydi.
          </p>
          <input
            value={reopenStudentId}
            onChange={(e) => setReopenStudentId(e.target.value)}
            placeholder="Student ID"
            className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={() =>
              reopenTest.mutate(reopenStudentId, {
                onSuccess: () => setReopenMessage('✅ Test qayta ochildi'),
                onError: (err: any) => setReopenMessage(`❌ ${err.message ?? 'Xatolik'}`),
              })
            }
            disabled={reopenTest.isPending || !reopenStudentId.trim()}
            className="rounded-full bg-coral/20 text-coral font-semibold px-5 py-2 text-sm disabled:opacity-50"
          >
            {reopenTest.isPending ? 'Ochilmoqda...' : 'Qayta ochish'}
          </button>
          {reopenMessage && <p className="text-sm">{reopenMessage}</p>}
        </div>
      )}
    </div>
  );
}
