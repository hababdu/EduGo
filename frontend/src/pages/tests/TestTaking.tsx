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
  const [showNav, setShowNav] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const total = session.questions.length;
  const question = session.questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const selected = answers[question.id] ?? [];
  const isLowTime = remaining <= 30;

  const isAnswered = (q: (typeof session.questions)[number]) =>
    q.type === 'TEXT_ANSWER'
      ? (q.id === question.id ? textDraft : textAnswers[q.id] ?? '').trim().length > 0
      : (answers[q.id]?.length ?? 0) > 0;
  const answeredCount = session.questions.filter(isAnswered).length;
  const unanswered = total - answeredCount;

  function goTo(i: number) {
    if (question.type === 'TEXT_ANSWER') submitTextAnswer(question.id, textDraft);
    setCurrentIndex(Math.max(0, Math.min(total - 1, i)));
    setShowNav(false);
  }

  function toggleOption(optionId: string) {
    haptic('light');
    if (question.type === 'MULTIPLE_CHOICE') {
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      selectAnswer(question.id, next);
    } else {
      selectAnswer(question.id, [optionId]);
      // Bitta javobli savolda tanlagach avtomatik keyingisiga o'tamiz
      if (!isLast) setTimeout(() => setCurrentIndex((i) => Math.min(total - 1, i + 1)), 350);
    }
  }

  function finish() {
    if (question.type === 'TEXT_ANSWER') submitTextAnswer(question.id, textDraft);
    haptic('medium');
    setShowConfirm(false);
    submit();
  }

  const typeLabel =
    question.type === 'MULTIPLE_CHOICE'
      ? "Bir nechta to'g'ri javobni belgilang"
      : question.type === 'TEXT_ANSWER'
      ? 'Javobni yozing'
      : "Bitta to'g'ri javobni tanlang";

  return (
    <div className="min-h-screen flex flex-col bg-aurora">
      <header className="sticky top-0 bg-base/90 backdrop-blur-md border-b border-white/5 z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => setShowNav(true)}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-ink active:scale-[0.97] transition"
            aria-label="Savollar ro'yxatini ochish"
          >
            <span className="tabular-nums">{currentIndex + 1} / {total}</span>
            <span className="text-ink-muted">· {answeredCount} javob</span>
          </button>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-base tabular-nums ${
              isLowTime ? 'bg-coral/15 text-coral animate-pulse' : 'bg-gold/10 text-gold'
            }`}
            aria-live="off"
          >
            ⏱ {formatTime(remaining)}
          </span>
        </div>
        <div className="h-1 w-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount}>
          <div className="h-full bg-teal transition-all duration-300" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
      </header>

      <div className="flex-1 px-4 py-5 max-w-2xl w-full mx-auto">
        <div className="rounded-3xl border border-white/10 bg-surface/50 backdrop-blur-sm p-5 mb-4">
          <p className="text-lg font-medium leading-snug text-ink">{question.text}</p>
        </div>
        <p className="text-xs text-ink-muted mb-3 px-1">{typeLabel}</p>

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
          </div>
        ) : (
          <div className="space-y-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selected.includes(opt.id);
              const multi = question.type === 'MULTIPLE_CHOICE';
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  aria-pressed={isSelected}
                  className={`w-full flex items-center gap-3 text-left rounded-2xl px-4 py-4 text-[15px] transition-all active:scale-[0.99] min-h-[56px] ${
                    isSelected
                      ? 'bg-gold/10 border border-gold text-ink'
                      : 'bg-surface/60 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold ${
                      multi ? 'rounded-lg' : 'rounded-full'
                    } ${isSelected ? 'bg-gold text-base' : 'bg-white/10 text-ink-muted'}`}
                    aria-hidden="true"
                  >
                    {isSelected && multi ? '✓' : String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 bg-base/90 backdrop-blur-md px-4 py-3 border-t border-white/5 flex gap-3">
        <button
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
          className="w-24 rounded-2xl bg-white/5 text-ink py-3.5 text-sm font-medium active:scale-[0.98] transition disabled:opacity-30"
        >
          ← Orqaga
        </button>
        {isLast ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-1 rounded-2xl bg-gold text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition"
          >
            Yakunlash
          </button>
        ) : (
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="flex-1 rounded-2xl bg-teal text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition"
          >
            {isAnswered(question) ? 'Keyingi →' : "O'tkazib yuborish →"}
          </button>
        )}
      </footer>

      {showNav && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setShowNav(false)}>
          <div
            className="w-full max-w-2xl mx-auto rounded-t-3xl bg-surface border-t border-white/10 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base text-ink">Savollar</h3>
              <span className="text-xs text-ink-muted">{answeredCount}/{total} javob berilgan</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {session.questions.map((q, i) => {
                const done = isAnswered(q);
                return (
                  <button
                    key={q.id}
                    onClick={() => goTo(i)}
                    className={`aspect-square rounded-xl text-sm font-bold tabular-nums transition ${
                      i === currentIndex
                        ? 'ring-2 ring-gold text-gold bg-gold/10'
                        : done
                        ? 'bg-teal/20 text-teal'
                        : 'bg-white/5 text-ink-muted'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-teal/40" /> Javob berilgan</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-white/15" /> Javobsiz</span>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full rounded-2xl bg-gold text-base font-semibold py-3 text-sm active:scale-[0.98] transition"
            >
              Testni yakunlash
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm rounded-3xl bg-surface border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-lg text-ink">Testni yakunlaysizmi?</h3>
            <p className="text-sm text-ink-muted">
              {unanswered > 0
                ? `${unanswered} ta savolga hali javob bermadingiz. Yakunlasangiz, ular xato hisoblanadi.`
                : "Barcha savollarga javob berdingiz. Yakunlagandan so'ng o'zgartirib bo'lmaydi."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl bg-white/5 text-ink py-3 text-sm font-medium"
              >
                Davom etish
              </button>
              <button onClick={finish} className="flex-1 rounded-2xl bg-gold text-base font-semibold py-3 text-sm">
                Yakunlash
              </button>
            </div>
          </div>
        </div>
      )}
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
