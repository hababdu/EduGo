// src/components/student/StatChips.tsx
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';

interface StatChipsProps {
  rank: number;
  streak: number;
  subjectCount: number;
  /** Reyting chip bosilganda chaqiriladi. Berilmasa, chip bosilmaydi. */
  onRankClick?: () => void;
}

/**
 * Karta emas — kichik "pill" chip'lar, gorizontal skroll.
 * Har birida faqat bitta raqam + label, ortiqcha dekoratsiyasiz.
 */
export function StatChips({
  rank,
  streak,
  subjectCount,
  onRankClick,
}: StatChipsProps) {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  // Default: agar onRankClick berilmasa, reytingga navigate qil
  const handleRankClick = () => {
    haptic('light');
    if (onRankClick) {
      onRankClick();
    } else {
      navigate('/ranking');
    }
  };

  const handleStreakClick = () => {
    haptic('light');
    // Streak haqida — keyinchalik alohida sahifa bo'lsa
  };

  const handleSubjectClick = () => {
    haptic('light');
    navigate('/lessons');
  };

  const chips = [
    {
      key: 'rank',
      icon: '🏆',
      value: `#${rank}`,
      label: 'reyting',
      onClick: handleRankClick,
    },
    {
      key: 'streak',
      icon: '🔥',
      value: `${streak}`,
      label: streak === 1 ? 'kun' : 'kun ketma-ket',
      onClick: handleStreakClick,
    },
    {
      key: 'subjects',
      icon: '📚',
      value: `${subjectCount}`,
      label: 'fan',
      onClick: handleSubjectClick,
    },
  ];

  return (
    <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClick}
          className="flex items-center gap-2 shrink-0 rounded-full bg-surface px-4 py-2 active:scale-[0.97] transition-transform"
        >
          <span aria-hidden="true">{chip.icon}</span>
          <span className="font-semibold text-sm tabular-nums">
            {chip.value}
          </span>
          <span className="text-xs text-ink-muted">{chip.label}</span>
        </button>
      ))}
    </div>
  );
}

export default StatChips;