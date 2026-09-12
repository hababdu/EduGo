import { useState, useMemo, useCallback } from 'react';
import {
  useQuestions,
  useDeleteQuestion,
} from '../../../hooks/useQuestions';
import { CreateQuestionForm } from '../../../components/admin/questions/CreateQuestionForm';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Oson',
  MEDIUM: "O'rtacha",
  HARD: 'Qiyin',
};

const DIFFICULTY_BADGE: Record<string, string> = {
  HARD: 'bg-coral/20 text-coral',
  MEDIUM: 'bg-gold/20 text-gold',
  EASY: 'bg-teal/20 text-teal',
};

interface QuestionItem {
  id: string;
  text: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  options?: any[];
}

export function AdminQuestions() {
  const { haptic, hapticNotify, showConfirm } = useTelegram();

  const { data: questions, isLoading } = useQuestions();
  const deleteQuestion = useDeleteQuestion();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  /* ---------- Filter ---------- */
  const filteredQuestions = useMemo<QuestionItem[]>(() => {
    if (!questions || !Array.isArray(questions)) return [];
    const q = search.trim().toLowerCase();
    return (questions as QuestionItem[]).filter((item) => {
      const matchesSearch = !q || item.text.toLowerCase().includes(q);
      const matchesDifficulty = difficultyFilter
        ? item.difficulty === difficultyFilter
        : true;
      return matchesSearch && matchesDifficulty;
    });
  }, [questions, search, difficultyFilter]);

  const hasActiveFilters = search.trim() !== '' || difficultyFilter !== '';

  const handleResetFilters = useCallback(() => {
    haptic('light');
    setSearch('');
    setDifficultyFilter('');
  }, [haptic]);

  /* ---------- Delete ---------- */
  const handleDelete = useCallback(
    async (id: string) => {
      haptic('medium');
      const confirmed = await showConfirm("Bu savolni o'chirmoqchimisiz?");
      if (!confirmed) return;

      deleteQuestion.mutate(id, {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Savol o'chirildi");
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || "O'chirishda xatolik!");
        },
      });
    },
    [haptic, hapticNotify, showConfirm, deleteQuestion]
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-4 bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="font-display text-xl sm:text-2xl text-ink">
            Savollar banki
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {questions
              ? `Jami: ${questions.length} ta savol`
              : 'Yuklanmoqda...'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic('light');
            setShowForm((v) => !v);
          }}
          className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3.5 font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-gold/10"
        >
          {showForm ? '✕ Yopish' : '+ Yangi savol'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface/40 p-5 sm:p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
          <CreateQuestionForm
            onCreated={() => {
              hapticNotify('success');
              toast('success', "Savol qo'shildi");
              setShowForm(false);
            }}
          />
        </div>
      )}

      {/* Search + Filter */}
      <div className="space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Savol matni bo'yicha qidirish..."
          className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
        />

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { key: '', label: 'Barchasi' },
            { key: 'EASY', label: '🟢 Oson' },
            { key: 'MEDIUM', label: "🟡 O'rta" },
            { key: 'HARD', label: '🔴 Qiyin' },
          ].map(({ key, label }) => (
            <button
              key={key || 'all'}
              type="button"
              onClick={() => {
                haptic('light');
                setDifficultyFilter(key);
              }}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                difficultyFilter === key
                  ? 'bg-gold text-base'
                  : 'bg-white/5 text-ink-muted hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between bg-surface/20 px-4 py-3 rounded-2xl border border-white/5">
          <span className="text-xs text-ink-muted">
            Topildi:{' '}
            <strong className="text-ink">{filteredQuestions.length}</strong> ta
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-gold font-semibold"
          >
            Tozalash
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            {hasActiveFilters ? 'Natija topilmadi' : "Hali savollar yo'q"}
          </p>
          <p className="text-xs text-ink-muted">
            {hasActiveFilters
              ? "Filtr yoki qidiruvni o'zgartirib ko'ring"
              : "Birinchi savolni qo'shing"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              if (hasActiveFilters) handleResetFilters();
              else setShowForm(true);
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            {hasActiveFilters ? 'Filtrlarni tozalash' : '+ Savol qo\'shish'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => {
            const diffBadge = DIFFICULTY_BADGE[q.difficulty] || 'bg-surface text-ink-muted';
            return (
              <div
                key={q.id}
                className="bg-surface/20 p-4 rounded-3xl border border-white/5 space-y-3"
              >
                <p className="text-sm font-medium text-ink leading-relaxed break-words">
                  {q.text}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${diffBadge}`}
                  >
                    {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
                    {q.points} ball
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
                    {q.options?.length ?? 0} variant
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    disabled={deleteQuestion.isPending}
                    className="flex-1 text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[40px]"
                  >
                    🗑 O'chirish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminQuestions;