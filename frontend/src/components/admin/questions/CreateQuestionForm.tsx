import { useState } from 'react';
import { useCreateQuestion } from '../../../hooks/useQuestions';

const TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Bitta to\'g\'ri javob' },
  { value: 'MULTIPLE_CHOICE', label: 'Bir nechta to\'g\'ri javob' },
  { value: 'TRUE_FALSE', label: 'To\'g\'ri/Noto\'g\'ri' },
];

const DIFFICULTIES = [
  { value: 'EASY', label: 'Oson' },
  { value: 'MEDIUM', label: "O'rtacha" },
  { value: 'HARD', label: 'Qiyin' },
];

interface OptionDraft {
  text: string;
  isCorrect: boolean;
}

export function CreateQuestionForm({ onCreated }: { onCreated?: () => void }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('SINGLE_CHOICE');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [points, setPoints] = useState(5);
  const [options, setOptions] = useState<OptionDraft[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [error, setError] = useState<string | null>(null);

  const createQuestion = useCreateQuestion();

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function toggleCorrect(index: number) {
    if (type === 'SINGLE_CHOICE' || type === 'TRUE_FALSE') {
      setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
    } else {
      updateOption(index, { isCorrect: !options[index].isCorrect });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!text.trim()) return setError('Savol matnini kiriting');
    const filledOptions = options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) return setError('Kamida 2 ta variant kerak');
    if (!filledOptions.some((o) => o.isCorrect)) {
      return setError("Kamida bitta to'g'ri javob belgilang");
    }

    createQuestion.mutate(
      {
        text: text.trim(),
        type,
        difficulty,
        points,
        options: filledOptions,
      },
      {
        onSuccess: () => {
          setText('');
          setOptions([
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ]);
          onCreated?.();
        },
        onError: (err: any) => setError(err.message ?? 'Xatolik yuz berdi'),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface p-4 space-y-3 mb-6">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Savol matni"
        rows={2}
        className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
      />

      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 bg-surfaceRaised rounded-lg px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="flex-1 bg-surfaceRaised rounded-lg px-3 py-2 text-sm"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-20 bg-surfaceRaised rounded-lg px-3 py-2 text-sm"
          min={1}
        />
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type={type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
              checked={opt.isCorrect}
              onChange={() => toggleCorrect(i)}
              className="accent-teal shrink-0"
            />
            <input
              value={opt.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
              placeholder={`Variant ${i + 1}`}
              className="flex-1 bg-surfaceRaised rounded-lg px-3 py-2 text-sm outline-none"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-coral text-xs"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, { text: '', isCorrect: false }])}
            className="text-xs text-ink-muted underline"
          >
            + Variant qo'shish
          </button>
        )}
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <button
        type="submit"
        disabled={createQuestion.isPending}
        className="rounded-full bg-gold text-base font-semibold px-5 py-2 text-sm disabled:opacity-50"
      >
        {createQuestion.isPending ? 'Saqlanmoqda...' : 'Savolni saqlash'}
      </button>
    </form>
  );
}
