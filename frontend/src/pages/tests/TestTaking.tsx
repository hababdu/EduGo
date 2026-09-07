import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestSession } from '../../hooks/useTestSession';
import { haptic } from '../../lib/telegram';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TestTaking() {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const { session, answers, remaining, status, errorMessage, result, selectAnswer, submit } =
    useTestSession(testId);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-ink-muted">Test yuklanmoqda...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center px-8 text-center">
        <div>
          <p className="font-display text-xl mb-2">Testni ochib bo'lmadi</p>
          <p className="text-sm text-ink-muted mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-gold text-base font-semibold px-5 py-2 text-sm"
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (status === 'submitted' && result) {
    return <TestResultView result={result} onDone={() => navigate('/')} />;
  }

  if (!session) return null;

  const question = session.questions[currentIndex];
  const isLast = currentIndex === session.questions.length - 1;
  const selected = answers[question.id] ?? [];
  const isLowTime = remaining <= 30;

  function toggleOption(optionId: string) {
    haptic('light');
    if (question.type === 'MULTIPLE_CHOICE') {
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      selectAnswer(question.id, next);
    } else {
      selectAnswer(question.id, [optionId]);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Timer — doim ko'rinadigan header */}
      <header className="sticky top-0 bg-base/95 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-white/5 z-10">
        <span className="text-xs text-ink-muted">
          {currentIndex + 1} / {session.questions.length}
        </span>
        <span
          className={`font-display text-lg tabular-nums ${isLowTime ? 'text-coral' : 'text-gold'}`}
        >
          ⏱ {formatTime(remaining)}
        </span>
      </header>

      <div className="flex-1 px-5 py-6">
        <p className="text-lg leading-snug mb-6">{question.text}</p>

        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                className={`w-full text-left rounded-xl px-4 py-3.5 text-sm transition-colors ${
                  isSelected ? 'bg-gold-soft border border-gold text-ink' : 'bg-surface border border-transparent'
                }`}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>

      <footer className="sticky bottom-0 bg-base/95 backdrop-blur px-5 py-4 border-t border-white/5 flex gap-3">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="flex-1 rounded-full bg-surface py-3 text-sm disabled:opacity-30"
        >
          Oldingi
        </button>
        {isLast ? (
          <button
            onClick={() => {
              haptic('medium');
              submit();
            }}
            className="flex-1 rounded-full bg-gold text-base font-semibold py-3 text-sm"
          >
            Yakunlash
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 rounded-full bg-teal text-base font-semibold py-3 text-sm"
          >
            Keyingi
          </button>
        )}
      </footer>
    </div>
  );
}

function TestResultView({
  result,
  onDone,
}: {
  result: { score: number; maxScore: number; percent: number; passed: boolean; autoSubmitted: boolean };
  onDone: () => void;
}) {
  return (
    <div className="h-screen flex items-center justify-center px-8 text-center">
      <div>
        <p className="text-5xl mb-4" aria-hidden="true">
          {result.passed ? '🎉' : '📚'}
        </p>
        <p className="font-display text-4xl text-gold mb-1">
          {result.score}/{result.maxScore}
        </p>
        <p className="text-sm text-ink-muted mb-1">{result.percent}%</p>
        <p className={`text-sm font-medium mb-6 ${result.passed ? 'text-teal' : 'text-coral'}`}>
          {result.passed ? 'O\'tdingiz' : 'O\'ta olmadingiz'}
        </p>
        {result.autoSubmitted && (
          <p className="text-xs text-ink-faint mb-6">
            Vaqt tugagani sababli test avtomatik yakunlandi.
          </p>
        )}
        <button
          onClick={onDone}
          className="rounded-full bg-gold text-base font-semibold px-6 py-2.5 text-sm"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    </div>
  );
}
