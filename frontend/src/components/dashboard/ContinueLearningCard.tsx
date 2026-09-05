import { haptic } from '../../lib/telegram';

interface ContinueLearningCardProps {
  subjectTitle: string;
  progressPercent: number;
  onContinue: () => void;
}

/**
 * Sahifadagi YAGONA "karta" — shu bilan diqqatni o'ziga tortadi,
 * chunki qolgan bloklar chegarasiz. Fon — subtile gradient (rasm o'rnini
 * bosuvchi), poster URL kelajakda shu joyga background-image sifatida qo'shiladi.
 */
export function ContinueLearningCard({
  subjectTitle,
  progressPercent,
  onContinue,
}: ContinueLearningCardProps) {
  return (
    <section className="px-5">
      <h2 className="text-sm text-ink-muted mb-2">Davom eting</h2>
      <button
        onClick={() => {
          haptic('light');
          onContinue();
        }}
        className="w-full text-left rounded-2xl p-5 relative overflow-hidden active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, #232750 0%, #1B1E3A 100%)',
        }}
      >
        <p className="font-display text-2xl">{subjectTitle}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-black/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted tabular-nums">{progressPercent}%</span>
        </div>
      </button>
    </section>
  );
}
