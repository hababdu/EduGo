import { ReactNode } from 'react';
import { ChevronRight } from '../../design/icons';
import { ICON } from '../../design/tokens';

interface Props {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className = '',
}: Props) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 text-left ${
        onClick ? 'hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors' : ''
      } ${className}`}
    >
      {leading}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-ink-muted truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {trailing ??
        (onClick && <ChevronRight className={`${ICON.sm} text-ink-muted shrink-0`} />)}
    </Wrapper>
  );
}