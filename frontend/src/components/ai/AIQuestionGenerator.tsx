import React, { useState, useCallback, useRef } from 'react';
import { toast } from '../../components/ui/Toast';
import { useTelegram } from '../../hooks/useTelegram';
import {
  generateQuestions,
  generateSingleQuestion,
  AIServiceError,
  type GeneratedQuestion,
  type Difficulty,
} from '../../lib/ai-service';
import { AIGenerateModal } from './AIGenerateModal';

type DifficultyInput = Difficulty | 'MIXED';

interface DraftQuestion extends GeneratedQuestion {
  _id: string;
  _regenerating?: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const DIFFICULTY_META: Record<Difficulty, { label: string; dot: string }> = {
  EASY: { label: 'Oson', dot: 'bg-emerald-400' },
  MEDIUM: { label: "O'rta", dot: 'bg-amber-400' },
  HARD: { label: 'Qiyin', dot: 'bg-red-400' },
};

interface AIQuestionGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  /** Foydalanuvchi "Testga qo'shish" bosganda chaqiriladi */
  onAccept: (questions: GeneratedQuestion[]) => void;
}

export function AIQuestionGenerator({
  isOpen,
  onClose,
  onAccept,
}: AIQuestionGeneratorProps) {
  const { haptic, hapticNotify } = useTelegram();

  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyInput>('MIXED');

  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopReveal = () => {
    if (revealTimer.current) {
      clearInterval(revealTimer.current);
      revealTimer.current = null;
    }
  };

  const revealProgressively = (total: number) => {
    stopReveal();
    setRevealedCount(0);
    let i = 0;
    revealTimer.current = setInterval(() => {
      i += 1;
      setRevealedCount(i);
      if (i >= total) stopReveal();
    }, 220);
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      hapticNotify('error');
      toast('error', 'Mavzuni kiriting!');
      return;
    }
    if (count < 1 || count > 20) {
      hapticNotify('error');
      toast('error', "Savollar soni 1 dan 20 gacha bo'lishi kerak!");
      return;
    }

    haptic('light');
    setIsGenerating(true);
    setDrafts([]);
    setRevealedCount(0);

    try {
      const generated = await generateQuestions({
        topic: topic.trim(),
        count,
        difficulty,
      });

      if (generated.length === 0) {
        hapticNotify('error');
        toast('error', 'Hech qanday savol generatsiya qilinmadi');
        return;
      }

      const withIds: DraftQuestion[] = generated.map((q) => ({
        ...q,
        _id: makeId(),
      }));
      setDrafts(withIds);
      revealProgressively(withIds.length);
      hapticNotify('success');
    } catch (err: any) {
      hapticNotify('error');
      const msg =
        err instanceof AIServiceError
          ? err.message
          : "AI bilan bog'lanishda xatolik";
      toast('error', msg);
    } finally {
      setIsGenerating(false);
    }
  }, [topic, count, difficulty, haptic, hapticNotify]);

  const handleGenerateMore = useCallback(async () => {
    if (!topic.trim()) return;
    haptic('light');
    setIsGenerating(true);
    try {
      const more = await generateQuestions({
        topic: topic.trim(),
        count: 3,
        difficulty,
      });
      if (more.length === 0) {
        toast('error', "Qo'shimcha savol yaratilmadi");
        return;
      }
      const withIds: DraftQuestion[] = more.map((q) => ({
        ...q,
        _id: makeId(),
      }));
      setDrafts((prev) => {
        const next = [...prev, ...withIds];
        revealProgressively(next.length);
        return next;
      });
      hapticNotify('success');
    } catch (err: any) {
      hapticNotify('error');
      toast('error', "Qo'shimcha savol yaratishda xatolik");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, difficulty, haptic, hapticNotify]);

  const handleRegenerate = useCallback(
    async (id: string) => {
      haptic('light');
      setDrafts((prev) =>
        prev.map((d) => (d._id === id ? { ...d, _regenerating: true } : d)),
      );
      try {
        const avoidTexts = drafts.filter((d) => d._id !== id).map((d) => d.text);
        const fresh = await generateSingleQuestion({
          topic: topic.trim(),
          difficulty,
          avoidTexts,
        });
        setDrafts((prev) =>
          prev.map((d) =>
            d._id === id ? { ...fresh, _id: id, _regenerating: false } : d,
          ),
        );
        hapticNotify('success');
      } catch (err: any) {
        hapticNotify('error');
        toast('error', 'Qayta yaratishda xatolik');
        setDrafts((prev) =>
          prev.map((d) =>
            d._id === id ? { ...d, _regenerating: false } : d,
          ),
        );
      }
    },
    [drafts, topic, difficulty, haptic, hapticNotify],
  );

  const handleDelete = (id: string) => {
    haptic('light');
    setDrafts((prev) => prev.filter((d) => d._id !== id));
  };

  const handleClose = () => {
    stopReveal();
    onClose();
  };

  const handleAccept = () => {
    if (drafts.length === 0) return;
    haptic('medium');
    onAccept(drafts.map(({ _id, _regenerating, ...q }) => q));
    setDrafts([]);
    setTopic('');
    handleClose();
  };

  const hasResults = drafts.length > 0;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={handleClose}
      icon="✨"
      title="AI bilan savol yaratish"
      subtitle="Mavzuni yozing, AI test savollarini tayyorlaydi"
      footer={
        hasResults ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerateMore}
              disabled={isGenerating}
              className="flex-1 text-xs font-semibold text-gold bg-gold/10 border border-gold/20 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px]"
            >
              + Yana 3 ta
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isGenerating || drafts.some((d) => d._regenerating)}
              className="flex-[2] text-sm font-semibold bg-gold text-base rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px]"
            >
              ✅ {drafts.length} ta savolni qo'shish
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3.5 font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
                Generatsiya qilinmoqda...
              </>
            ) : (
              '✨ Savollarni generatsiya qilish'
            )}
          </button>
        )
      }
    >
      {!hasResults ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">
              Mavzu / fan nomi
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Masalan: Algebra — kvadrat tenglamalar"
              disabled={isGenerating}
              autoFocus
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Savollar soni
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Qiyinlik
              </label>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as DifficultyInput)
                }
                disabled={isGenerating}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
              >
                <option value="MIXED">Aralash</option>
                <option value="EASY">Oson</option>
                <option value="MEDIUM">O'rta</option>
                <option value="HARD">Qiyin</option>
              </select>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-2.5 pt-2">
              {[...Array(Math.min(count, 5))].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-surface/50 border border-white/5 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {drafts.map((q, index) => {
            const meta = DIFFICULTY_META[q.difficulty];
            const visible = index < revealedCount;
            return (
              <div
                key={q._id}
                className={`bg-surface/50 rounded-2xl border border-white/5 p-4 space-y-2.5 transition-all duration-300 ${
                  visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2 pointer-events-none h-0 p-0 border-0 overflow-hidden'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-ink leading-relaxed flex-1">
                    {q._regenerating ? (
                      <span className="inline-flex items-center gap-2 text-ink-muted">
                        <span className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                        Qayta yaratilmoqda...
                      </span>
                    ) : (
                      q.text
                    )}
                  </p>
                  <span className="shrink-0 flex items-center gap-1.5 text-[10px] text-ink-muted bg-white/5 px-2 py-1 rounded-full">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>

                {!q._regenerating && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`text-xs px-2.5 py-1.5 rounded-lg truncate ${
                          i === q.correctAnswerIndex
                            ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                            : 'bg-white/[0.03] text-ink-muted'
                        }`}
                      >
                        {i === q.correctAnswerIndex ? '✓ ' : ''}
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRegenerate(q._id)}
                    disabled={q._regenerating}
                    className="text-[11px] font-semibold text-gold px-2.5 py-1.5 rounded-lg bg-gold/10 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    🔄 Qayta yaratish
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q._id)}
                    disabled={q._regenerating}
                    className="text-[11px] font-semibold text-red-400 px-2.5 py-1.5 rounded-lg bg-red-500/10 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    ✕ O'chirish
                  </button>
                </div>
              </div>
            );
          })}

          {drafts.length === 0 && (
            <p className="text-center text-xs text-ink-muted py-8">
              Barcha savollar o'chirildi. Yopib qaytadan urinib ko'ring.
            </p>
          )}
        </div>
      )}
    </AIGenerateModal>
  );
}

export default AIQuestionGenerator;