import { ReactNode } from 'react';
import { BackdropImage } from '../ui/BackdropImage';

type Accent = 'gold' | 'teal' | 'sky';

const EYEBROW: Record<Accent, string> = {
  gold: 'text-gold',
  teal: 'text-teal',
  sky: 'text-sky',
};
const GLOW: Record<Accent, string> = {
  gold: 'from-gold/20',
  teal: 'from-teal/20',
  sky: 'from-sky/20',
};

interface Props {
  /** Kichik katta harfli yorliq (masalan, "O'QITUVCHI PANELI") */
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
  accent?: Accent;
  /** Tugmalar (o'ng tomonda / mobil'da pastda) */
  actions?: ReactNode;
  /** Hero ostidagi ixcham ko'rsatkichlar qatori */
  footer?: ReactNode;
  /** "Orqaga" tugmasi uchun yuqoriga qo'yiladigan element */
  top?: ReactNode;
}

/**
 * Admin/o'qituvchi sahifalarining yuqori "banner"i: xira rasm, aurora yorug'ligi,
 * dekorativ halqalar. Matn har doim o'qiladigan.
 */
export function StaffHero({ eyebrow, title, subtitle, image, accent = 'gold', actions, footer, top }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/60 shadow-xl">
      <BackdropImage src={image} opacity={0.42} blur={4}>
        <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${GLOW[accent]} via-transparent to-transparent`} aria-hidden="true" />
        <Rings accent={accent} />
        <div className="relative p-5 sm:p-7 space-y-4">
          {top}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${EYEBROW[accent]}`}>{eyebrow}</span>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink leading-tight">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-ink-muted max-w-xl">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
          </div>
          {footer}
        </div>
      </BackdropImage>
    </section>
  );
}

/** Burchakdagi dekorativ halqalar (sof SVG, tarmoq so'rovi yo'q). */
function Rings({ accent }: { accent: Accent }) {
  const stroke = accent === 'teal' ? '#34D0A0' : accent === 'sky' ? '#38BDF8' : '#FFB020';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 opacity-30"
      fill="none"
      stroke={stroke}
    >
      <circle cx="100" cy="100" r="92" strokeWidth="1" />
      <circle cx="100" cy="100" r="68" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="100" cy="100" r="44" strokeWidth="1.5" />
      <circle cx="168" cy="52" r="4" fill={stroke} stroke="none" />
      <circle cx="40" cy="150" r="3" fill={stroke} stroke="none" />
    </svg>
  );
}
