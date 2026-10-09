import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from '../../components/ui/Toast';
import { useTelegram } from '../../hooks/useTelegram';
import {
  generateQuestions,
  generateSingleQuestion,
  AIServiceError,
  type GeneratedQuestion,
  type Difficulty,
  type QuestionsSource,
} from '../../lib/ai-service';
import { useTeacherAssignments } from '../../hooks/useTeacherAssignments';
import { AIGenerateModal } from './AIGenerateModal';

type DifficultyInput = Difficulty | 'MIXED';
type Mode = 'MATERIAL' | 'TOPIC';

interface DraftQuestion extends GeneratedQuestion {
  _id: string;
  _regenerating?: boolean;
  _selected: boolean;
}

const makeId = () => Math.random().toString(36).slice(2, 10);

const DIFF: Record<Difficulty, { label: string; chip: string; dot: string }> = {
  EASY: { label: 'Oson', chip: 'bg-teal/15 text-teal', dot: 'bg-teal' },
  MEDIUM: { label: "O'rta", chip: 'bg-gold/15 text-gold', dot: 'bg-gold' },
  HARD: { label: 'Qiyin', chip: 'bg-coral/15 text-coral', dot: 'bg-coral' },
};

const DIFF_CHOICES: { key: DifficultyInput; label: string }[] = [
  { key: 'MIXED', label: 'Aralash' },
  { key: 'EASY', label: 'Oson' },
  { key: 'MEDIUM', label: "O'rta" },
  { key: 'HARD', label: 'Qiyin' },
];

const COUNT_PRESETS = [5, 10, 15, 20];

const GEN_STEPS = ['Material o‘qilmoqda', 'Savollar tuzilmoqda', 'Variantlar tekshirilmoqda'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** "Testga qo'shish" bosilganda chaqiriladi */
  onAccept: (questions: GeneratedQuestion[]) => void;
}

export function AIQuestionGenerator({ isOpen, onClose, onAccept }: Props) {
  const { haptic, hapticNotify } = useTelegram();

  const [mode, setMode] = useState<Mode>('MATERIAL');
  const [assignmentId, setAssignmentId] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<DifficultyInput>('MIXED');

  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [source, setSource] = useState<QuestionsSource | null>(null);

  const { data: assignments, isLoading: assignmentsLoading } = useTeacherAssignments();
  const selectedMaterial = assignments?.find((a) => a.id === assignmentId);
  const topic = mode === 'MATERIAL' ? selectedMaterial?.title ?? '' : topicInput;
  const srcId = mode === 'MATERIAL' ? assignmentId : undefined;

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.trim().toLowerCase();
    return (assignments ?? []).filter((a) => !q || a.title.toLowerCase().includes(q));
  }, [assignments, materialSearch]);

  // Generatsiya paytida bosqichlar matni almashib turadi (haqiqiy progress yo'q — faqat his)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isGenerating) {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setGenStep(0);
      return;
    }
    stepTimer.current = setInterval(() => setGenStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 2500);
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, [isGenerating]);

  const toDrafts = (qs: GeneratedQuestion[]): DraftQuestion[] =>
    qs.map((q) => ({ ...q, _id: makeId(), _selected: true }));

  const fail = (err: unknown, fallback: string) => {
    hapticNotify('error');
    toast('error', err instanceof AIServiceError ? err.message : fallback);
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      hapticNotify('error');
      toast('error', mode === 'MATERIAL' ? 'Materialni tanlang' : 'Mavzuni kiriting');
      return;
    }
    haptic('light');
    setIsGenerating(true);
    setDrafts([]);
    try {
      const res = await generateQuestions({ topic: topic.trim(), count, difficulty, assignmentId: srcId });
      if (res.questions.length === 0) {
        hapticNotify('error');
        toast('error', 'Savollar yaratilmadi, qayta urinib ko‘ring');
        return;
      }
      setSource(res.source ?? null);
      setDrafts(toDrafts(res.questions));
      hapticNotify('success');
    } catch (err) {
      fail(err, "AI bilan bog'lanishda xatolik");
    } finally {
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, count, difficulty, srcId, mode, haptic, hapticNotify]);

  const handleMore = useCallback(async () => {
    haptic('light');
    setIsGenerating(true);
    try {
      const { questions } = await generateQuestions({ topic: topic.trim(), count: 3, difficulty, assignmentId: srcId });
      if (questions.length === 0) return toast('error', "Qo'shimcha savol yaratilmadi");
      setDrafts((prev) => [...prev, ...toDrafts(questions)]);
      hapticNotify('success');
    } catch (err) {
      fail(err, "Qo'shimcha savol yaratishda xatolik");
    } finally {
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, difficulty, srcId, haptic, hapticNotify]);

  const handleRegenerate = useCallback(
    async (id: string) => {
      haptic('light');
      setDrafts((prev) => prev.map((d) => (d._id === id ? { ...d, _regenerating: true } : d)));
      try {
        const avoidTexts = drafts.filter((d) => d._id !== id).map((d) => d.text);
        const fresh = await generateSingleQuestion({ topic: topic.trim(), difficulty, avoidTexts, assignmentId: srcId });
        setDrafts((prev) => prev.map((d) => (d._id === id ? { ...fresh, _id: id, _selected: d._selected } : d)));
        hapticNotify('success');
      } catch (err) {
        fail(err, 'Qayta yaratishda xatolik');
        setDrafts((prev) => prev.map((d) => (d._id === id ? { ...d, _regenerating: false } : d)));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, topic, difficulty, srcId, haptic, hapticNotify],
  );

  const patch = (id: string, p: Partial<DraftQuestion>) =>
    setDrafts((prev) => prev.map((d) => (d._id === id ? { ...d, ...p } : d)));

  const chosen = drafts.filter((d) => d._selected);
  const allSelected = drafts.length > 0 && chosen.length === drafts.length;

  const handleAccept = () => {
    if (chosen.length === 0) return;
    haptic('medium');
    onAccept(chosen.map(({ _id, _regenerating, _selected, ...q }) => q));
    setDrafts([]);
    setSource(null);
    setTopicInput('');
    setAssignmentId('');
    onClose();
  };

  const hasResults = drafts.length > 0;
  const busy = isGenerating || drafts.some((d) => d._regenerating);

  /* ───────── footer ───────── */
  const footer = hasResults ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          setDrafts([]);
          setSource(null);
        }}
        disabled={busy}
        className="rounded-2xl bg-white/5 px-4 py-3 text-xs font-semibold text-ink-muted disabled:opacity-40 min-h-[48px]"
      >
        ← Sozlamalar
      </button>
      <button
        type="button"
        onClick={handleMore}
        disabled={busy}
        className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-xs font-semibold text-gold disabled:opacity-40 min-h-[48px]"
      >
        {isGenerating ? '...' : '+3 ta'}
      </button>
      <button
        type="button"
        onClick={handleAccept}
        disabled={busy || chosen.length === 0}
        className="flex-1 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-base active:scale-[0.98] transition disabled:opacity-40 min-h-[48px]"
      >
        Testga qo‘shish ({chosen.length})
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating || !topic.trim()}
      className="w-full rounded-2xl bg-gold px-5 py-3.5 text-sm font-bold text-base active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2 min-h-[52px]"
    >
      {isGenerating ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-base/30 border-t-base" />
          {GEN_STEPS[genStep]}...
        </>
      ) : (
        `✨ ${count} ta savol yaratish`
      )}
    </button>
  );

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      icon="✨"
      title="AI savol yaratish"
      subtitle={hasResults ? 'Tekshiring, kerakmasini olib tashlang' : 'Material yoki mavzu asosida test savollari'}
      footer={footer}
    >
      {!hasResults ? (
        <div className="space-y-6">
          {/* 1. Manba */}
          <section className="space-y-2.5">
            <StepLabel n={1} text="Savollar qayerdan olinsin?" />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['MATERIAL', '📎', 'Material asosida', 'Matn va PDF dan'],
                  ['TOPIC', '💡', 'Mavzu bo‘yicha', 'Umumiy bilimdan'],
                ] as const
              ).map(([k, icon, title, sub]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMode(k)}
                  disabled={isGenerating}
                  className={`rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                    mode === k ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-surface/40'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className={`mt-1 block text-sm font-bold ${mode === k ? 'text-gold' : 'text-ink'}`}>{title}</span>
                  <span className="block text-[11px] text-ink-muted">{sub}</span>
                </button>
              ))}
            </div>

            {mode === 'MATERIAL' ? (
              <div className="space-y-2">
                {assignmentsLoading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-surface/50" />
                ) : !assignments || assignments.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-surface/40 p-4 text-xs leading-relaxed text-ink-muted">
                    Hali material yo‘q. Avval “Materiallar” bo‘limida material yarating yoki “Mavzu bo‘yicha” rejimini tanlang.
                  </p>
                ) : (
                  <>
                    {assignments.length > 5 && (
                      <input
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        placeholder="Material qidirish..."
                        className="w-full rounded-2xl border border-white/10 bg-surface/50 px-4 py-2.5 text-sm text-ink outline-none focus:border-gold/50"
                      />
                    )}
                    <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                      {filteredMaterials.map((a) => {
                        const on = a.id === assignmentId;
                        const nFiles = a.files?.length ?? 0;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAssignmentId(a.id)}
                            disabled={isGenerating}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                              on ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-surface/40 hover:border-white/20'
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${
                                on ? 'border-gold bg-gold text-base' : 'border-white/20'
                              }`}
                            >
                              {on && '✓'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                              <span className="block truncate text-[11px] text-ink-muted">
                                {a.group?.name ?? 'Guruh'} · {nFiles > 0 ? `${nFiles} ta fayl` : 'faqat matn'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                      {filteredMaterials.length === 0 && (
                        <p className="py-4 text-center text-xs text-ink-muted">Hech narsa topilmadi</p>
                      )}
                    </div>
                  </>
                )}
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  AI tavsifni va biriktirilgan PDF, DOCX, TXT fayllarni o‘qiydi. Savollar faqat shu ma’lumotdan tuziladi.
                  Rasm va videolar o‘qilmaydi.
                </p>
              </div>
            ) : (
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Masalan: Algebra — kvadrat tenglamalar"
                disabled={isGenerating}
                className="w-full rounded-2xl border border-white/10 bg-surface/50 px-4 py-3 text-sm text-ink outline-none focus:border-gold/50 min-h-[48px]"
              />
            )}
          </section>

          {/* 2. Soni */}
          <section className="space-y-2.5">
            <StepLabel n={2} text="Nechta savol?" />
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-2xl border border-white/10 bg-surface/50">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  disabled={isGenerating || count <= 1}
                  className="h-11 w-11 text-lg text-ink-muted disabled:opacity-30"
                  aria-label="Kamaytirish"
                >
                  −
                </button>
                <span className="w-10 text-center font-display text-lg font-bold tabular-nums text-ink">{count}</span>
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  disabled={isGenerating || count >= 20}
                  className="h-11 w-11 text-lg text-ink-muted disabled:opacity-30"
                  aria-label="Ko‘paytirish"
                >
                  +
                </button>
              </div>
              <div className="flex flex-1 gap-1.5">
                {COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    disabled={isGenerating}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                      count === n ? 'bg-gold/15 text-gold' : 'bg-white/5 text-ink-muted'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Qiyinlik */}
          <section className="space-y-2.5">
            <StepLabel n={3} text="Qiyinlik darajasi" />
            <div className="grid grid-cols-4 gap-1.5">
              {DIFF_CHOICES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDifficulty(d.key)}
                  disabled={isGenerating}
                  className={`rounded-xl border py-2.5 text-xs font-semibold transition ${
                    difficulty === d.key
                      ? 'border-gold/50 bg-gold/10 text-gold'
                      : 'border-white/10 bg-surface/40 text-ink-muted'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          {isGenerating && (
            <div className="space-y-2" aria-live="polite">
              {[...Array(Math.min(count, 3))].map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-2xl border border-white/5 bg-surface/50"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {source && (
            <div className="rounded-2xl border border-teal/20 bg-teal/5 p-3 text-[11px] leading-relaxed text-ink-muted">
              <p>
                <span className="font-semibold text-teal">Manba:</span> {source.title}
                {source.used.length > 0 && <> · o‘qildi: {source.used.join(', ')}</>}
              </p>
              {source.skipped.length > 0 && (
                <p className="mt-1 text-gold">
                  O‘qilmadi: {source.skipped.map((f) => `${f.name} (${f.reason})`).join('; ')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-ink-muted">
              <b className="text-ink">{chosen.length}</b> / {drafts.length} tanlangan
            </span>
            <button
              type="button"
              onClick={() => setDrafts((prev) => prev.map((d) => ({ ...d, _selected: !allSelected })))}
              className="text-xs font-semibold text-gold"
            >
              {allSelected ? 'Hammasini bekor qilish' : 'Hammasini tanlash'}
            </button>
          </div>

          {drafts.map((q, idx) => {
            const meta = DIFF[q.difficulty];
            return (
              <article
                key={q._id}
                className={`rounded-2xl border p-4 transition ${
                  q._selected ? 'border-white/15 bg-surface/50' : 'border-white/5 bg-surface/20 opacity-55'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => patch(q._id, { _selected: !q._selected })}
                    aria-pressed={q._selected}
                    aria-label={`${idx + 1}-savolni tanlash`}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-bold transition ${
                      q._selected ? 'border-gold bg-gold text-base' : 'border-white/25'
                    }`}
                  >
                    {q._selected && '✓'}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-ink-muted">№{idx + 1}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.chip}`}>{meta.label}</span>
                    </div>
                    {q._regenerating ? (
                      <p className="flex items-center gap-2 text-sm text-ink-muted">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                        Qayta yaratilmoqda...
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-snug text-ink">{q.text}</p>
                        <div className="mt-3 space-y-1.5">
                          {q.options.map((opt, i) => {
                            const correct = i === q.correctAnswerIndex;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => patch(q._id, { correctAnswerIndex: i })}
                                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                  correct
                                    ? 'bg-teal/10 text-ink ring-1 ring-teal/40'
                                    : 'bg-white/[0.03] text-ink-muted hover:bg-white/[0.06]'
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                                    correct ? 'bg-teal text-black' : 'bg-white/10'
                                  }`}
                                >
                                  {correct ? '✓' : String.fromCharCode(65 + i)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[10px] text-ink-faint">To‘g‘ri javob noto‘g‘ri bo‘lsa, variantni bosib o‘zgartiring</p>
                      </>
                    )}
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRegenerate(q._id)}
                        disabled={q._regenerating}
                        className="rounded-lg bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold disabled:opacity-40"
                      >
                        🔄 Qayta yaratish
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => prev.filter((d) => d._id !== q._id))}
                        disabled={q._regenerating}
                        className="rounded-lg bg-coral/10 px-2.5 py-1.5 text-[11px] font-semibold text-coral disabled:opacity-40"
                      >
                        O‘chirish
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AIGenerateModal>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold text-ink">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/15 text-[10px] text-gold">{n}</span>
      {text}
    </h3>
  );
}

export default AIQuestionGenerator;
