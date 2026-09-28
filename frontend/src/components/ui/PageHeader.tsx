import { ReactNode } from 'react';
import { ChevronLeft } from '../../design/icons';
import { TEXT, ICON } from '../../design/tokens';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, onBack, actions }: Props) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 text-ink-muted hover:text-ink active:scale-95 transition shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Orqaga"
        >
          <ChevronLeft className={ICON.md} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className={`${TEXT.h1} truncate`}>{title}</h1>
        {subtitle && <p className={`${TEXT.caption} mt-0.5 truncate`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}