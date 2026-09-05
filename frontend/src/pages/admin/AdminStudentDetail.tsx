import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminStudentDetail, useBlockStudent, useAdjustScore } from '../../hooks/useAdmin';

export function AdminStudentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: student, isLoading } = useAdminStudentDetail(id);
  const blockMutation = useBlockStudent();
  const adjustScore = useAdjustScore();

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading || !student) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  const isBlocked = student.status === 'BLOCKED';

  function handleAdjustScore(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = Number(amount);
    if (!parsed || Number.isNaN(parsed)) {
      setFormError('Ball miqdorini kiriting (masalan: 50 yoki -20)');
      return;
    }
    if (!reason.trim()) {
      setFormError('Sabab ko\'rsatilishi shart — bu audit logga yoziladi');
      return;
    }

    adjustScore.mutate(
      { id, amount: parsed, reason },
      {
        onSuccess: () => {
          setAmount('');
          setReason('');
        },
      },
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-6">
        ← Orqaga
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl">
            {student.firstName} {student.lastName ?? ''}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {student.username ? `@${student.username}` : 'username yo\'q'} ·{' '}
            {isBlocked ? 'Bloklangan' : 'Faol'}
          </p>
        </div>
        <button
          onClick={() => blockMutation.mutate({ id, blocked: !isBlocked })}
          disabled={blockMutation.isPending}
          className={`text-sm px-4 py-2 rounded-full font-medium ${
            isBlocked ? 'bg-teal text-base' : 'bg-coral/20 text-coral'
          }`}
        >
          {isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 border-t border-b border-white/5 py-5">
        <div>
          <p className="text-xl font-semibold tabular-nums">{student.studentProfile?.totalScore ?? 0}</p>
          <p className="text-xs text-ink-muted mt-0.5">ball</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums">{student.studentProfile?.level ?? 1}</p>
          <p className="text-xs text-ink-muted mt-0.5">daraja</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums">{student.streak?.currentStreak ?? 0}</p>
          <p className="text-xs text-ink-muted mt-0.5">kunlik streak</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-sm text-ink-muted mb-3">Qo'lda ball berish/ayirish</h2>
        <form onSubmit={handleAdjustScore} className="space-y-3">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Masalan: 50 yoki -20"
            className="w-full bg-surface rounded-lg px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab (audit logga yoziladi)"
            className="w-full bg-surface rounded-lg px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          {formError && <p className="text-sm text-coral">{formError}</p>}
          <button
            type="submit"
            disabled={adjustScore.isPending}
            className="rounded-full bg-gold text-base font-semibold px-5 py-2 text-sm disabled:opacity-50"
          >
            {adjustScore.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm text-ink-muted mb-3">So'nggi test natijalari</h2>
        {student.testAttempts?.length === 0 ? (
          <p className="text-sm text-ink-faint">Hali testlar topshirilmagan.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {student.testAttempts?.map((a: any) => (
              <div key={a.id} className="py-2.5 flex justify-between text-sm">
                <span>{a.test.title}</span>
                <span className={a.passed ? 'text-teal' : 'text-coral'}>
                  {a.score}/{a.maxScore}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
