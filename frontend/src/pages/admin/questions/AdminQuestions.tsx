import { useState, useMemo } from 'react';
import { useQuestions, useDeleteQuestion } from '../../../hooks/useQuestions';
import { CreateQuestionForm } from '../../../components/admin/questions/CreateQuestionForm';

const DIFFICULTY_LABELS: Record<string, string> = { 
  EASY: 'Oson', 
  MEDIUM: "O'rtacha", 
  HARD: 'Qiyin' 
};

export function AdminQuestions() {
  const { data: questions, isLoading } = useQuestions();
  const deleteQuestion = useDeleteQuestion();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q: any) => {
      const matchesSearch = q.text.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficultyFilter ? q.difficulty === difficultyFilter : true;
      return matchesSearch && matchesDifficulty;
    });
  }, [questions, search, difficultyFilter]);

  const hasActiveFilters = search.trim() !== '' || difficultyFilter !== '';

  const handleResetFilters = () => {
    setSearch('');
    setDifficultyFilter('');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Sarlavha va Yangi savol qo'shish tugmasi */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Savollar banki</h1>
          <p className="text-xs text-ink-muted mt-1">
            {questions ? `Jami: ${questions.length} ta savol` : "Savollar ro'yxati"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs bg-gold text-base rounded-xl px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Yopish' : '+ Yangi savol'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface/30 p-6 rounded-2xl border border-white/5">
          <CreateQuestionForm onCreated={() => setShowForm(false)} />
        </div>
      )}

      {/* Qidirish va Filtrlar paneli */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Savol matni bo'yicha qidirish..."
          className="bg-surface rounded-xl px-4 py-2.5 text-sm placeholder:text-ink-faint outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
        />
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="bg-surface rounded-xl px-3 py-2.5 text-sm outline-none border border-white/5 cursor-pointer text-ink"
        >
          <option value="">Barcha qiyinlik darajalari</option>
          <option value="EASY">Oson (EASY)</option>
          <option value="MEDIUM">O'rtacha (MEDIUM)</option>
          <option value="HARD">Qiyin (HARD)</option>
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between bg-surface/20 px-4 py-2 rounded-xl border border-white/5">
          <span className="text-xs text-ink-muted">
            Topildi: <strong className="text-ink">{filteredQuestions.length}</strong> ta savol
          </span>
          <button
            onClick={handleResetFilters}
            className="text-xs text-gold hover:underline"
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}

      {/* Kontent qismi */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface/50 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 bg-surface/20 rounded-2xl border border-white/5 space-y-3">
          <p className="text-sm text-ink-muted">
            {hasActiveFilters ? "Qidiruvga mos savollar topilmadi." : "Hali savollar yo'q. Yuqoridan birinchisini qo'shing."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs bg-gold text-base font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Filtrlarni olib tashlash
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
          {filteredQuestions.map((q: any) => {
            const diffClass =
              q.difficulty === 'HARD'
                ? 'bg-coral/20 text-coral'
                : q.difficulty === 'MEDIUM'
                ? 'bg-gold/20 text-gold'
                : 'bg-teal/20 text-teal';

            return (
              <div key={q.id} className="py-4 flex items-start justify-between gap-4 group">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium text-ink leading-relaxed">{q.text}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${diffClass}`}>
                      {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                    </span>
                    <span>·</span>
                    <span>{q.points} ball</span>
                    <span>·</span>
                    <span>{q.options?.length ?? 0} ta variant</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Bu savolni o'chirasizmi?")) deleteQuestion.mutate(q.id);
                  }}
                  className="text-xs text-coral hover:bg-coral/10 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                >
                  O'chirish
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}