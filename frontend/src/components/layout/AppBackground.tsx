/**
 * Butun ilova orqasidagi fon: to'q fon + aurora yorug'liklari.
 * pointer-events yo'q, scroll bilan qimirlamaydi.
 */
export function AppBackground() {
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50 bg-base bg-aurora" />;
}
