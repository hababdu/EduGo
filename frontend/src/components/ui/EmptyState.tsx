import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  const ActionIcon = action?.icon;
  return (
    <div className="text-center py-12 px-6 space-y-3">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
        <Icon className="w-7 h-7 text-ink-muted" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {subtitle && (
          <p className="text-xs text-ink-muted max-w-xs mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-xl active:scale-[0.98] transition"
        >
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
          {action.label}
        </button>
      )}
    </div>
  );
}