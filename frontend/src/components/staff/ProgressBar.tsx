import { useEffect, useState } from 'react';

interface Props {
  value: number; // 0–100
  tone?: 'gold' | 'teal' | 'coral' | 'auto';
  className?: string;
}

/** Yupqa progress (mount bo'lganda 0 dan yumshoq to'ladi). tone="auto": 70+ teal, 40+ gold, qolgani coral. */
export function ProgressBar({ value, tone = 'teal', className = '' }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const t = tone === 'auto' ? (v >= 70 ? 'teal' : v >= 40 ? 'gold' : 'coral') : tone;
  const fill = t === 'gold' ? 'bg-gold' : t === 'coral' ? 'bg-coral' : 'bg-teal';
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(v));
    return () => cancelAnimationFrame(id);
  }, [v]);
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-tint/10 ${className}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${w}%`, transition: 'width 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)' }} />
    </div>
  );
}
