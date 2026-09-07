import { StatusBadge } from './StatusBadge';

interface ContentRowProps {
  title: string;
  status: string;
  subtitle?: string;
  onClick: () => void;
}

export function ContentRow({ title, status, subtitle, onClick }: ContentRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 text-left hover:bg-surface/50 px-2 -mx-2 rounded-lg transition-colors"
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      <StatusBadge status={status} />
    </button>
  );
}
