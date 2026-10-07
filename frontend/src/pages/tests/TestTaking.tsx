import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestSession } from '../../hooks/useTestSession';
import { haptic } from '../../lib/telegram';
import { AIAnswerCheck } from '../../components/ai/AIAnswerCheck';
import { useMascot } from '../../components/ai/AIMascot';
import { generateMascotLine } from '../../lib/ai-service';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TestTaking() {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const { session, answers, textAnswers, remaining, status, errorMessage, result, selectAnswer, submitTextAnswer, submit } =
    useTestSession(testId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textDraft, setTextDraft] = useState('');

  // Joriy savol TEXT_ANSWER bo'lsa, qoralamani saqlangan javobdan yuklaymiz
  useEffect(() => {
    if (!session) return;
    const q = session.questions[currentIndex];
    if (q && q.type === 'TEXT_ANSWER') {
      setTextDraft(textAnswers[q.id] ?? '');
    }
  }, [session, currentIndex, textAnswers]);

  if (status === 'loading') {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/20 border-t-gold" aria-hidden="true" />
        <p className="text-sm text-ink-muted">Test yuklanmoqda...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center px-8 text-center">
        <div>
          <p className="text-4xl mb-3" aria-hidden="true">⚠️</p>
          <p className="font-display text-xl mb-2">Testni ochib bo'lmadi</p>
          <p className="text-sm text-ink-muted mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-2xl bg-gold text-base font-semibold px-6 py-3 text-sm active:scale-[0.98] transition"
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
    <div className="min-h-screen flex flex-col bg-aurora">
      {/* Timer — doim ko'rinadigan header */}
      <header className="sticky top-0 bg-base/90 backdrop-blur-md border-b border-white/5 z-10">
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-muted">
            Savol <span className="text-ink">{currentIndex + 1}</span> / {session.questions.length}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-base tabular-nums ${
              isLowTime ? 'bg-coral/15 text-coral animate-pulse' : 'bg-gold/10 text-gold'
            }`}
          >
            ⏱ {formatTime(remaining)}
          </span>
        </div>
        <div className="h-1 w-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={session.questions.length} aria-valuenow={currentIndex + 1}>
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / session.questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1 px-5 py-6 max-w-2xl w-full mx-auto">
        <div className="rounded-3xl border border-white/10 bg-surface/50 backdrop-blur-sm p-5 mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold mb-2">
            {question.type === 'MULTIPLE_CHOICE' ? 'Bir nechta javob' : question.type === 'TEXT_ANSWER' ? 'Yozma javob' : 'Bitta javob'}
          </p>
          <p className="text-lg font-medium leading-snug text-ink">{question.text}</p>
        </div>

        {question.type === 'TEXT_ANSWER' ? (
          <div className="space-y-3">
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onBlur={() => submitTextAnswer(question.id, textDraft)}
              placeholder="Javobingizni shu yerga yozing..."
              rows={6}
              className="w-full bg-surface/60 rounded-2xl px-4 py-3.5 text-sm outline-none border border-white/10 text-ink resize-none focus:border-gold/60"
            />
            <AIAnswerCheck question={question.text} answer={textDraft} />
            <p className="text-[10px] text-ink-muted">
              AI bahosi faqat sizga yordam uchun — rasmiy ball
              o'qituvchi/tizim tomonidan qo'yiladi.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  aria-pressed={isSelected}
                  className={`w-full flex items-center gap-3 text-left rounded-2xl px-4 py-3.5 text-sm transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'bg-gold/10 border border-gold text-ink shadow-[0_0_0_1px_rgba(255,176,32,0.25)]'
                      : 'bg-surface/60 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isSelected ? 'bg-gold text-base' : 'bg-white/10 text-ink-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 bg-base/90 backdrop-blur-md px-5 py-4 border-t border-white/5 flex gap-3">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="flex-1 rounded-2xl bg-white/5 text-ink py-3.5 text-sm font-medium active:scale-[0.98] transition disabled:opacity-30"
        >
          Oldingi
        </button>
        {isLast ? (
          <button
            onClick={() => {
              haptic('medium');
              submit();
            }}
            className="flex-1 rounded-2xl bg-gold text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition"
          >
            Yakunlash
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 rounded-2xl bg-teal text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition"
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
  const { celebrate, comfort, speak } = useMascot();

  useEffect(() => {
    // 1) Darhol — statik animatsiya bilan tezkor reaksiya (kutish yo'q)
    if (result.passed) celebrate();
    else comfort();

    // 2) Bir necha soniyadan so'ng — HAQIQIY AI aynan shu ballga qarab
    // yozgan, shaxsiylashtirilgan gap bilan pufakchani yangilaydi
    generateMascotLine({
      event: 'TEST_RESULT',
      percent: result.percent,
      passed: result.passed,
    })
      .then((line) => speak(line.text, line.mood))
      .catch(() => {
        /* jim — statik reaksiya allaqachon ko'rsatilgan */
      });
    // Faqat natija birinchi ko'rsatilganda bir marta chaqiriladi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ring = result.passed ? '#34D0A0' : '#F0654B';
  const circ = 2 * Math.PI * 54;
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center bg-aurora">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-surface/50 backdrop-blur-sm p-7">
        <div className="relative mx-auto mb-5 h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - Math.max(0, Math.min(100, result.percent)) / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-extrabold text-ink">{result.percent}%</span>
            <span className="text-xs text-ink-muted tabular-nums">
              {result.score}/{result.maxScore}
            </span>
          </div>
        </div>
        <p className="text-4xl mb-2" aria-hidden="true">
          {result.passed ? '🎉' : '📚'}
        </p>
        <p className={`font-display text-xl font-bold mb-1 ${result.passed ? 'text-teal' : 'text-coral'}`}>
          {result.passed ? "O'tdingiz!" : "O'ta olmadingiz"}
        </p>
        {result.autoSubmitted && (
          <p className="text-xs text-ink-faint mt-2">
            Vaqt tugagani sababli test avtomatik yakunlandi.
          </p>
        )}
        <button
          onClick={onDone}
          className="mt-6 w-full rounded-2xl bg-gold text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    </div>
  );
}
