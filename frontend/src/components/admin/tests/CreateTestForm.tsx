import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../../../hooks/useQuestions';
import { useCreateTest } from '../../../hooks/useTests';

export function CreateTestForm({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const { data: questions, isLoading } = useQuestions();
  const createTest = useCreateTest();

  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [passingScore, setPassingScore] = useState(70);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [randomQuestions, setRandomQuestions] = useState(false);
  const [randomAnswerOrder, setRandomAnswerOrder] = useState(true);
  const [questionCount, setQuestionCount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Test nomini kiriting");
    if (selectedIds.length === 0) return setError('Kamida bitta savol tanlang');
    if (randomQuestions && questionCount > selectedIds.length) {
      return setError(
        `Tanlangan savollar (${selectedIds.length}) random son (${questionCount})dan kam bo'lmasligi kerak`,
      );
    }

    createTest.mutate(
      {
        title: title.trim(),
        durationSeconds: durationMinutes * 60,
        passingScore,
        questionIds: selectedIds,
        randomQuestions,
        randomAnswerOrder,
        questionCount: randomQuestions ? questionCount : undefined,
      },
      {
        onSuccess: (created: any) => navigate(`/admin/tests/${created.id}`),
        onError: (err: any) => setError(err.message ?? 'Xatolik yuz berdi'),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface p-4 space-y-4 mb-6">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Test nomi (masalan: Algebra №1)"
        className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm outline-none"
      />

      <div className="flex gap-3">
        <label className="flex-1 text-xs text-ink-muted">
          Davomiyligi (daqiqa)
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full mt-1 bg-surfaceRaised rounded-lg px-3 py-2 text-sm outline-none"
            min={1}
          />
        </label>
        <label className="flex-1 text-xs text-ink-muted">
          O'tish balli (%)
          <input
            type="number"
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className="w-full mt-1 bg-surfaceRaised rounded-lg px-3 py-2 text-sm outline-none"
            min={1}
            max={100}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={randomQuestions}
          onChange={(e) => setRandomQuestions(e.target.checked)}
          className="accent-gold"
        />
        Random savollar (18-band)
      </label>
      {randomQuestions && (
        <input
          type="number"
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          placeholder="Nechta savol tanlansin"
          className="w-full bg-surfaceRaised rounded-lg px-3 py-2 text-sm outline-none"
          min={1}
        />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={randomAnswerOrder}
          onChange={(e) => setRandomAnswerOrder(e.target.checked)}
          className="accent-gold"
        />
        Random javob tartibi (19-band)
      </label>

      <div>
        <p className="text-sm text-ink-muted mb-2">
          Savollarni tanlang ({selectedIds.length} tanlangan)
        </p>
        {isLoading ? (
          <div className="h-32 bg-surfaceRaised rounded-lg animate-pulse" />
        ) : questions && questions.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Hali savollar bank'da yo'q. Avval "Savollar banki" bo'limidan qo'shing.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-white/5 rounded-lg p-2">
            {questions?.map((q) => (
              <label
                key={q.id}
                className="flex items-start gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-surfaceRaised cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(q.id)}
                  onChange={() => toggleQuestion(q.id)}
                  className="accent-teal mt-0.5"
                />
                <span className="flex-1">{q.text}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full bg-surfaceRaised py-2.5 text-sm"
        >
          Bekor qilish
        </button>
        <button
          type="submit"
          disabled={createTest.isPending}
          className="flex-1 rounded-full bg-gold text-base font-semibold py-2.5 text-sm disabled:opacity-50"
        >
          {createTest.isPending ? 'Yaratilmoqda...' : 'Testni yaratish'}
        </button>
      </div>
    </form>
  );
}
