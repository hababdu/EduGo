interface StatChipsProps {
  rank: number;
  streak: number;
  subjectCount: number;
}

/**
 * Karta emas — kichik "pill" chip'lar, gorizontal skroll.
 * Har birida faqat bitta raqam + label, ortiqcha dekоratsiyasiz.
 */
export function StatChips({ rank, streak, subjectCount }: StatChipsProps) {
  const chips = [
    { icon: '🏆', value: `#${rank}`, label: 'reyting' },
    { icon: '🔥', value: `${streak}`, label: streak === 1 ? 'kun' : 'kun ketma-ket' },
    { icon: '📚', value: `${subjectCount}`, label: 'fan' },
  ];

  return (
    <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="flex items-center gap-2 shrink-0 rounded-full bg-surface px-4 py-2"
        >
          <span aria-hidden="true">{chip.icon}</span>
          <span className="font-semibold text-sm">{chip.value}</span>
          <span className="text-xs text-ink-muted">{chip.label}</span>
        </div>
      ))}
    </div>
  );
}
