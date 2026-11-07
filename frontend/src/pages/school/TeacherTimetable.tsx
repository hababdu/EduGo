import { StaffHero } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { TimetableView } from './TimetableView';

export default function TeacherTimetable() {
  return (
    <div className={PAGE}>
      <StaffHero accent="teal" image={IMAGES.hero} eyebrow="EduGo · O'qituvchi" title="Dars jadvalim" subtitle="Maktab admini tayinlagan haftalik darslaringiz." />
      <TimetableView url="/api/v1/timetable/mine" keyName="mine" who="teacher" />
    </div>
  );
}
