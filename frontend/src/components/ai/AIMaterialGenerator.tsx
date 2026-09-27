import React, { useState, useCallback } from 'react';
import { toast } from '../../components/ui/Toast';
import { useTelegram } from '../../hooks/useTelegram';
import {
  generateMaterial,
  AIServiceError,
  type AssignmentCategory,
  type GeneratedMaterial,
} from '../../lib/ai-service';
import { AIGenerateModal } from './AIGenerateModal';

const CATEGORY_META: Record<AssignmentCategory, { label: string; emoji: string }> = {
  LESSON: { label: 'Dars mavzusi', emoji: '📖' },
  HOMEWORK: { label: 'Uy vazifasi', emoji: '📝' },
  RESOURCE: { label: "Qo'shimcha resurs", emoji: '📎' },
};

interface DraftVariant extends GeneratedMaterial {
  _id: string;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

interface AIMaterialGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: AssignmentCategory;
  /** Foydalanuvchi 3 variantdan birini tanlaganda chaqiriladi */
  onAccept: (material: GeneratedMaterial) => void;
}

export function AIMaterialGenerator({
  isOpen,
  onClose,
  initialCategory,
  onAccept,
}: AIMaterialGeneratorProps) {
  const { haptic, hapticNotify } = useTelegram();

  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<AssignmentCategory>(initialCategory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);

  const revealProgressively = (total: number) => {
    setRevealedCount(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setRevealedCount(i);
      if (i >= total) clearInterval(timer);
    }, 250);
  };

  const runGeneration = useCallback(async () => {
    if (!topic.trim()) {
      hapticNotify('error');
      toast('error', 'Mavzuni kiriting!');
      return;
    }

    haptic('light');
    setIsGenerating(true);
    setVariants([]);
    setRevealedCount(0);

    try {
      // 3 ta variantni parallel generatsiya qilamiz — har biri temperature
      // tasodifiyligi tufayli boshqacha chiqadi
      const results = await Promise.allSettled([
        generateMaterial({ topic: topic.trim(), category }),
        generateMaterial({ topic: topic.trim(), category }),
        generateMaterial({ topic: topic.trim(), category }),
      ]);

      const ok: DraftVariant[] = results
        .filter(
          (r): r is PromiseFulfilledResult<GeneratedMaterial> =>
            r.status === 'fulfilled',
        )
        .map((r) => ({ ...r.value, _id: makeId() }));

      if (ok.length === 0) {
        hapticNotify('error');
        toast('error', 'Variant yaratib bo\'lmadi, qayta urinib ko\'ring');
        return;
      }

      setVariants(ok);
      revealProgressively(ok.length);
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
  }, [topic, category, haptic, hapticNotify]);

  const handleClose = () => {
    onClose();
  };

  const handlePick = (variant: DraftVariant) => {
    haptic('medium');
    const { _id, ...material } = variant;
    onAccept(material);
    setVariants([]);
    setTopic('');
    handleClose();
  };

  const hasResults = variants.length > 0;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={handleClose}
      icon="✨"
      title="AI bilan material yaratish"
      subtitle="3 ta variant taklif qilinadi — eng yoqqanini tanlaysiz"
      footer={
        hasResults ? (
          <button
            type="button"
            onClick={runGeneration}
            disabled={isGenerating}
            className="w-full text-xs font-semibold text-gold bg-gold/10 border border-gold/20 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px]"
          >
            🔄 Boshqa 3 ta variant
          </button>
        ) : (
          <button
            type="button"
            onClick={runGeneration}
            disabled={isGenerating || !topic.trim()}
            className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3.5 font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
                3 ta variant tayyorlanmoqda...
              </>
            ) : (
              '✨ Variantlarni generatsiya qilish'
            )}
          </button>
        )
      }
    >
      {!hasResults ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">
              Mavzu
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

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">
              Material toifasi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_META) as AssignmentCategory[]).map(
                (key) => {
                  const meta = CATEGORY_META[key];
                  const active = category === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      disabled={isGenerating}
                      className={`text-xs font-semibold rounded-2xl py-3 px-2 border transition-all active:scale-[0.97] ${
                        active
                          ? 'bg-gold/15 border-gold/40 text-gold'
                          : 'bg-surface border-white/5 text-ink-muted'
                      }`}
                    >
                      <span className="block text-base mb-1">
                        {meta.emoji}
                      </span>
                      {meta.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {isGenerating && (
            <div className="grid gap-2.5 pt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-surface/50 border border-white/5 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {variants.map((v, index) => {
            const visible = index < revealedCount;
            return (
              <button
                key={v._id}
                type="button"
                onClick={() => handlePick(v)}
                className={`w-full text-left bg-surface/50 hover:bg-surface/70 rounded-2xl border border-white/5 hover:border-gold/30 p-4 space-y-2 transition-all duration-300 active:scale-[0.99] ${
                  visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2 pointer-events-none h-0 p-0 border-0 overflow-hidden'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink leading-snug">
                    {v.title}
                  </p>
                  <span className="shrink-0 text-[10px] font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full">
                    {index + 1}-variant
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">
                  {v.description}
                </p>
                <p className="text-[11px] text-gold font-semibold pt-1">
                  ✓ Shu variantni tanlash →
                </p>
              </button>
            );
          })}
        </div>
      )}
    </AIGenerateModal>
  );
}

export default AIMaterialGenerator;