/** Muddat: sana + soat, Toshkent vaqti (UTC+5) bilan. */
export const toTashkentIso = (local: string): string => `${local.length === 16 ? local : local.slice(0, 16)}:00+05:00`;

/** ISO → `datetime-local` qiymati (Toshkent vaqtida) */
export function fromIsoToLocal(iso?: string | null): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + 5 * 3600_000).toISOString().slice(0, 16);
}

/** "10.10.2026, 23:59" */
export function formatDue(iso: string): string {
  return new Date(iso).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
