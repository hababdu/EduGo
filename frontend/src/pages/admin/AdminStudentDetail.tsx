import { useState, useMemo } from 'react';
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
  
  // Qo'shimcha filtrlar va qidiruv state'lari
  const [testSearch, setTestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [showBlockModal, setShowBlockModal] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <div className="h-6 w-20 bg-surface/50 rounded-lg animate-pulse" />
        <div className="h-24 bg-surface/50 rounded-2xl animate-pulse" />
        <div className="h-20 bg-surface/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4 py-16">
        <p className="text-sm text-ink-muted">Talaba topilmadi yoki yuklashda xatolik yuz berdi.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-xs bg-surface px-4 py-2 rounded-xl border border-white/10 text-ink"
        >
          ← Orqaga qaytish
        </button>
      </div>
    );
  }

  const isBlocked = student.status === 'BLOCKED';

  // Ballni tezkor o'zgartirish tugmalari uchun yordamchi funksiya
  const handleQuickScore = (val: number) => {
    setAmount(val.toString());
  };

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

  // Test natijalarini qidirish va filtrlash
  const filteredAttempts = useMemo(() => {
    if (!student.testAttempts) return [];
    return student.testAttempts.filter((a: any) => {
      const title = a.test?.title || '';
      const matchesSearch = title.toLowerCase().includes(testSearch.toLowerCase());
      if (statusFilter === 'PASSED') return matchesSearch && a.passed;
      if (statusFilter === 'FAILED') return matchesSearch && !a.passed;
      return matchesSearch;
    });
  }, [student.testAttempts, testSearch, statusFilter]);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8 pb-16">
      {/* Yuqori navigatsiya va asosiy ma'lumot */}
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-4 hover:text-ink transition-colors">
          ← Orqaga
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-ink">
              {student.firstName} {student.lastName ?? ''}
            </h1>
            <p className="text-sm text-ink-muted mt-1 flex items-center gap-2">
              <span>{student.username ? `@${student.username}` : 'username yo\'q'}</span>
              <span>·</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isBlocked ? 'bg-coral/20 text-coral' : 'bg-teal/20 text-teal'}`}>
                {isBlocked ? 'Bloklangan' : 'Faol'}
              </span>
            </p>
          </div>
          <button
            onClick={() => setShowBlockModal(true)}
            disabled={blockMutation.isPending}
            className={`text-sm px-4 py-2 rounded-full font-medium transition-all ${
              isBlocked ? 'bg-teal text-base hover:opacity-90' : 'bg-coral/20 text-coral hover:bg-coral/30'
            }`}
          >
            {isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
          </button>
        </div>
      </div>

      {/* Asosiy statistika gridi */}
      <div className="grid grid-cols-3 gap-4 border-t border-b border-white/5 py-5">
        <div className="bg-surface/50 p-3 rounded-xl border border-white/5">
          <p className="text-xl font-semibold tabular-nums text-gold">{student.studentProfile?.totalScore ?? 0}</p>
          <p className="text-xs text-ink-muted mt-0.5">Umumiy ball</p>
        </div>
        <div className="bg-surface/50 p-3 rounded-xl border border-white/5">
          <p className="text-xl font-semibold tabular-nums text-ink">{student.studentProfile?.level ?? 1}</p>
          <p className="text-xs text-ink-muted mt-0.5">Daraja</p>
        </div>
        <div className="bg-surface/50 p-3 rounded-xl border border-white/5">
          <p className="text-xl font-semibold tabular-nums text-ink">{student.streak?.currentStreak ?? 0} kun</p>
          <p className="text-xs text-ink-muted mt-0.5">Kunlik streak</p>
        </div>
      </div>

      {/* Qo'lda ball berish / ayirish bo'limi */}
      <section className="bg-surface/30 p-5 rounded-2xl border border-white/5 space-y-4">
        <h2 className="text-sm font-medium text-ink">Qo'lda ball berish / ayirish</h2>
        
        {/* Tezkor tugmalar */}
        <div className="flex flex-wrap gap-2">
          {[-50, -10, 10, 50, 100].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickScore(val)}
              className={`text-xs px-3 py-1 rounded-lg border border-white/10 transition-colors text-ink ${
                val > 0 ? 'hover:bg-teal/20 hover:text-teal' : 'hover:bg-coral/20 hover:text-coral'
              }`}
            >
              {val > 0 ? `+${val}` : val}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdjustScore} className="space-y-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ball miqdori (masalan: 50 yoki -20)"
            className="w-full bg-surface rounded-lg px-4 py-2.5 text-sm outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab (audit logga yoziladi, majburiy)"
            className="w-full bg-surface rounded-lg px-4 py-2.5 text-sm outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
          />
          {formError && <p className="text-xs text-coral">{formError}</p>}
          <button
            type="submit"
            disabled={adjustScore.isPending}
            className="w-full rounded-full bg-gold text-base font-semibold py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {adjustScore.isPending ? 'Saqlanmoqda...' : 'Balni yangilash'}
          </button>
        </form>
      </section>

      {/* Test natijalari bo'limi (Qidiruv va filtrlar bilan) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-ink">So'nggi test natijalari</h2>
          
          {/* Filtrlash va qidirish */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              placeholder="Test nomi..."
              className="bg-surface text-xs rounded-lg px-3 py-1.5 outline-none border border-white/5 focus-visible:ring-1 focus-visible:ring-gold w-36 text-ink"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-surface text-xs rounded-lg px-2 py-1.5 outline-none border border-white/5 text-ink-muted cursor-pointer"
            >
              <option value="ALL">Barchasi</option>
              <option value="PASSED">O'tganlar</option>
              <option value="FAILED">Yiqilganlar</option>
            </select>
          </div>
        </div>

        {filteredAttempts.length === 0 ? (
          <div className="text-center py-8 bg-surface/20 rounded-xl border border-white/5">
            <p className="text-sm text-ink-faint">Mos keladigan test natijalari topilmadi.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 bg-surface/20 rounded-xl px-4 border border-white/5">
            {filteredAttempts.map((a: any) => (
              <div key={a.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">{a.test?.title || "Noma'lum test"}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''} kuni topshirilgan
                  </p>
                </div>
                <div className="text-right">
                  <span className={`font-semibold tabular-nums ${a.passed ? 'text-teal' : 'text-coral'}`}>
                    {a.score}/{a.maxScore}
                  </span>
                  <p className="text-[10px] text-ink-muted uppercase">{a.passed ? 'Muvaffaqiyatli' : 'Yiqildi'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bloklashni tasdiqlash uchun Modal oynacha */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-display text-ink">
              {isBlocked ? 'Foydalanuvchini blokdan chiqarish' : 'Foydalanuvchini bloklash'}
            </h3>
            <p className="text-sm text-ink-muted">
              {isBlocked
                ? `Haqiqatan ham ${student.firstName}ni blokdan chiqarmoqchimisiz? U qaytadan tizimdan foydalana oladi.`
                : `Haqiqatan ham ${student.firstName}ni bloklamoqchimisiz? U bot va ilovadan foydalana olmay qoladi.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-sm rounded-lg bg-surface hover:bg-white/5 transition-colors text-ink"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  blockMutation.mutate(
                    { id, blocked: !isBlocked },
                    {
                      onSuccess: () => setShowBlockModal(false),
                    }
                  );
                }}
                disabled={blockMutation.isPending}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${
                  isBlocked ? 'bg-teal text-base' : 'bg-coral text-white'
                }`}
              >
                {blockMutation.isPending ? 'Bajarilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}