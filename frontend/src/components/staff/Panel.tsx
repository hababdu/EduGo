import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

type Accent = 'gold' | 'teal' | 'coral' | 'sky';
const CHIP: Record<Accent, string> = {
  gold: 'bg-gold/10 text-gold',
  teal: 'bg-teal/10 text-teal',
  coral: 'bg-coral/10 text-coral',
  sky: 'bg-sky/10 text-sky',
};

interface Props {
  title: string;
  icon?: LucideIcon;
  accent?: Accent;
  /** Sarlavhaning o'ng tomonidagi element (masalan, "Barchasi" havolasi) */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Ichki bo'shliqsiz (ro'yxatlar uchun) */
  flush?: boolean;
}

/** Yumaloq, shishasimon blok: ikonli sarlavha + kontent. */
export function Panel({ title, icon: Icon, accent = 'gold', action, children, className = '', flush = false }: Props) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-surface/40 backdrop-blur-sm overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-2.5 text-sm font-bold text-ink min-w-0">
          {Icon && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${CHIP[accent]}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </header>
      <div className={flush ? '' : 'px-5 pb-5'}>{children}</div>
    </section>
  );
}

/** Panel sarlavhasidagi "Barchasi →" kabi havola tugmasi. */
export function PanelLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-semibold text-gold hover:underline shrink-0">
      {children}
    </button>
  );
}
