import { LayoutDashboard, FolderOpen, BookOpen, ClipboardCheck } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff';
import { useEducationFeatures } from '../../hooks/useEducationFeatures';

const ITEMS: StaffNavItem[] = [
  { to: '/teacher', label: 'Asosiy', Icon: LayoutDashboard, end: true },
  { to: '/teacher/groups', label: 'Guruhlar', Icon: FolderOpen, match: ['/teacher/groups', '/teacher/timetable'] },
  {
    to: '/teacher/content/courses',
    label: 'Materiallar',
    Icon: BookOpen,
    match: ['/teacher/content', '/teacher/assignments', '/teacher/sections', '/teacher/topics', '/teacher/lessons'],
  },
  { to: '/teacher/tests', label: 'Testlar', Icon: ClipboardCheck, match: ['/teacher/tests', '/teacher/questions'] },
];

export function TeacherNav() {
  const { enabled } = useEducationFeatures();
  const items = ITEMS.filter((item) => item.to === '/teacher' || (item.to === '/teacher/groups' ? enabled('GROUPS') : item.to === '/teacher/tests' ? enabled('TESTS') : enabled('MATERIALS') || enabled('ASSIGNMENTS') || enabled('LESSONS')));
  return <StaffNav items={items} label="O'qituvchi navigatsiyasi" />;
}

export default TeacherNav;
