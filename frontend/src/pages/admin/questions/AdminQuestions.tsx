import { useState } from 'react';
import { useQuestions, useDeleteQuestion } from '../../../hooks/useQuestions';
import { CreateQuestionForm } from '../../../components/admin/questions/CreateQuestionForm';

const DIFFICULTY_LABELS: Record<string, string> = { EASY: 'Oson', MEDIUM: "O'rtacha", HARD: 'Qiyin' };

export function AdminQuestions() {
  const { data: questions, isLoading } = useQuestions();
  const deleteQuestion = useDeleteQuestion();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Savollar banki</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-gold text-base rounded-full px-4 py-2 font-medium"
        >
          {showForm ? 'Yopish' : '+ Yangi savol'}
        </button>
      </div>

      {showForm && <CreateQuestionForm onCreated={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : questions && questions.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">
          Hali savollar yo'q. Yuqoridan birinchisini qo'shing.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {questions?.map((q) => (
            <div key={q.id} className="py-3.5 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{q.text}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {DIFFICULTY_LABELS[q.difficulty]} · {q.points} ball · {q.options.length} variant
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm("Bu savolni o'chirasizmi?")) deleteQuestion.mutate(q.id);
                }}
                className="text-coral text-xs shrink-0"
              >
                O'chirish
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
