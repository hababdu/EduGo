/**
 * Butun ilova orqasidagi fon: to'q fon + aurora + rol aksentida sekin suzuvchi yorug'lik dog'lari.
 * pointer-events yo'q, scroll bilan qimirlamaydi. Dog'lar faqat transform bilan animatsiya qilinadi (yengil).
 */
export function AppBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50 overflow-hidden bg-base bg-aurora">
      <div
        className="blob blob-a -right-[20%] -top-[12%] h-[55vh] w-[55vh] opacity-60"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--c-accent) / 0.22), transparent)' }}
      />
      <div
        className="blob blob-b -bottom-[15%] -left-[18%] h-[60vh] w-[60vh] opacity-60"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--c-accent-2) / 0.16), transparent)' }}
      />
    </div>
  );
}
