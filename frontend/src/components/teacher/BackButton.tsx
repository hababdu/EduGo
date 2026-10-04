import { ArrowLeft } from 'lucide-react';

/** StaffHero `top` uchun "Orqaga" tugmasi. */
export function BackButton({ onClick, label = 'Orqaga' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-white/10 hover:text-ink transition min-h-[36px]"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
