import { LucideIcon } from 'lucide-react';
import { TEXT, ICON } from '../../design/tokens';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'gold' | 'teal' | 'coral';
  onClick?: () => void;
}

const ACCENT = {
  gold: 'text-gold',
  teal: 'text-teal',
  coral: 'text-coral',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'gold',
  onClick,
}: Props) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative bg-surface/20 border border-white/5 rounded-2xl p-4 overflow-hidden text-left ${
        onClick ? 'active:scale-[0.98] transition' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={TEXT.label}>{label}</span>
        <Icon className={`${ICON.sm} text-ink-muted/40 shrink-0`} />
      </div>
      <div className={`font-display text-2xl tabular-nums mt-2 ${ACCENT[accent]}`}>
        {value}
      </div>
    </Wrapper>
  );
}