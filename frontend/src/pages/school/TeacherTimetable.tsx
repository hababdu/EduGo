import { StaffHero } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { TimetableView } from './TimetableView';
import { ScheduleSessionRow, dt, useSchoolQuery } from './schoolApi';

export default function TeacherTimetable() {
  const { data: sessions } = useSchoolQuery<ScheduleSessionRow[]>(['my-schedule-sessions'], '/api/v1/timetable/sessions/mine');
  return (
    <div className={PAGE}>
      <StaffHero accent="teal" image={IMAGES.hero} eyebrow="EduGo · O'qituvchi" title="Dars jadvalim" subtitle="Maktab admini tayinlagan haftalik darslaringiz." />
      <TimetableView url="/api/v1/timetable/mine" keyName="mine" who="teacher" />
      {!!sessions?.length && <section className="mt-4 rounded-2xl border border-tint/10 bg-surface/40 p-4"><h2 className="mb-3 text-sm font-bold text-ink">Individual va bir martalik mashg‘ulotlar</h2><ul className="space-y-2">{sessions.map((x) => <li key={x.id} className="rounded-xl bg-tint/5 p-3"><div className="text-sm font-semibold text-ink">{x.title}</div><div className="mt-1 text-xs text-ink-muted">{dt(x.startsAt)} – {dt(x.endsAt)}{x.room ? ' · ' + x.room : ''}</div></li>)}</ul></section>}
    </div>
  );
}
