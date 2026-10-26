import { useEffect, useRef, useState } from 'react';

/** Raqamni 0 dan (yoki oldingi qiymatdan) yumshoq sanab chiqadi. Harakatni kamaytirish yoqilgan bo'lsa — darhol. */
export function useCountUp(target: number, ms = 800): number {
  const [v, setV] = useState(target);
  const from = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !Number.isFinite(target)) { setV(target); return; }
    const start = first.current ? 0 : from.current;
    first.current = false;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = start + (target - start) * eased;
      from.current = cur;
      setV(p < 1 ? cur : target);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return v;
}
