import { useMyAttendance, AttendanceStatus } from '../../hooks/useAttendance';

const DOT: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-teal',
  ABSENT: 'bg-coral',
  EXCUSED: 'bg-gold',
};
const LABEL: Record<AttendanceStatus, string> = { PRESENT: 'Keldi', ABSENT: 'Kelmadi', EXCUSED: 'Sababli' };

/** O'quvchining o'z davomati (oxirgi 60 kun) */
export function MyAttendanceCard({ groupId }: { groupId: string }) {
  const { data } = useMyAttendance(groupId);
  if (!data || data.percent == null) return null; // hali davomat belgilanmagan yoki xato — jim

  return (
    <section className="bg-surface/20 border border-white/5 rounded-3xl p-4" aria-label="Mening davomatim">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Mening davomatim</h2>
        <span className="font-display text-xl text-teal tabular-nums">{data.percent}%</span>
      </div>
      <div className="flex gap-4 text-xs text-ink-muted mb-3">
        <span><b className="text-teal tabular-nums">{data.present}</b> keldi</span>
        <span><b className="text-coral tabular-nums">{data.absent}</b> kelmadi</span>
        <span><b className="text-gold tabular-nums">{data.excused}</b> sababli</span>
      </div>
      <div className="flex gap-1.5 flex-wrap" aria-hidden="true">
        {[...data.recent].reverse().map((r) => (
          <span key={r.date} title={`${r.date}: ${LABEL[r.status]}`} className={`h-3 w-3 rounded-full ${DOT[r.status]}`} />
        ))}
      </div>
    </section>
  );
}
