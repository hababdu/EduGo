// ============================================================
// DESIGN TOKENS — yagona manba
// ============================================================

export const TEXT = {
  h1: 'font-display text-xl sm:text-2xl text-ink',
  h2: 'font-display text-base sm:text-lg text-ink',
  h3: 'text-sm font-semibold text-ink',
  body: 'text-sm text-ink',
  bodySm: 'text-xs text-ink-muted',
  caption: 'text-[11px] text-ink-muted',
  tiny: 'text-[10px] text-ink-muted',
  label: 'text-[11px] font-semibold text-ink-muted uppercase tracking-wide',
} as const;

export const SURFACE = {
  card: 'bg-surface/20 border border-white/5',
  cardHover: 'hover:bg-surface/30 transition-colors',
  panel: 'bg-surface/30 border border-white/5 backdrop-blur-md',
  input: 'bg-surface/40 border border-white/5',
} as const;

export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
} as const;

export const CONTROL = {
  input:
    'w-full bg-surface/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold/50 min-h-[44px] placeholder:text-ink-muted',
  select:
    'w-full bg-surface/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold/50 min-h-[44px]',
  textarea:
    'w-full bg-surface/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold/50 resize-none placeholder:text-ink-muted',
  buttonPrimary:
    'bg-gold text-base rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-[0.98] transition inline-flex items-center justify-center gap-2',
  buttonGhost:
    'bg-white/5 text-ink rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition inline-flex items-center justify-center gap-2',
  buttonSubtle:
    'bg-gold/10 text-gold rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-[0.98] transition inline-flex items-center justify-center gap-2',
  buttonDanger:
    'bg-red-500/10 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-[0.98] transition inline-flex items-center justify-center gap-2',
  chip: 'px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0',
  chipActive: 'bg-gold text-base',
  chipInactive: 'bg-white/5 text-ink-muted hover:bg-white/10',
} as const;

export const ICON = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
} as const;

export const PAGE = 'p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-32';
export const PAGE_NARROW = 'p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-32';
export const PAGE_WIDE = 'p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-32';