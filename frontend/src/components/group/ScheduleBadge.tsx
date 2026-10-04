import { CalendarDays } from 'lucide-react';
import { formatSchedule, GroupSchedule } from '../../hooks/useSchedule';

/** Guruh dars jadvalining ixcham ko'rinishi (jadval yo'q bo'lsa hech narsa chizmaydi). */
export function ScheduleBadge({ schedule, className = '' }: { schedule: GroupSchedule; className?: string }) {
  const text = formatSchedule(schedule);
  if (!text) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted ${className}`}>
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </span>
  );
}
