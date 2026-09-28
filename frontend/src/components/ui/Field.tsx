import { ReactNode } from 'react';
import { TEXT } from '../../design/tokens';

interface Props {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, required, children }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-ink-muted font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-coral">*</span>}
      </label>
      {children}
      {hint && <p className={TEXT.tiny}>{hint}</p>}
    </div>
  );
}

export function CheckboxRow({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-surface/40 border border-white/5 active:scale-[0.99] transition min-h-[52px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="cursor-pointer accent-gold w-5 h-5 shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-ink font-medium">{label}</span>
        </div>
        {description && <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>}
      </div>
    </label>
  );
}