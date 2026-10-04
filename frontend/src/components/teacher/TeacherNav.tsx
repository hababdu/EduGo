import { LayoutDashboard, FolderOpen, BookOpen, ClipboardCheck, MessageCircleQuestionMark } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff';

const ITEMS: StaffNavItem[] = [
  { to: '/teacher', label: 'Asosiy', Icon: LayoutDashboard, end: true },
  { to: '/teacher/groups', label: 'Guruhlar', Icon: FolderOpen },
  {
    to: '/teacher/content/courses',
    label: 'Materiallar',
    Icon: BookOpen,
    match: ['/teacher/content', '/teacher/assignments', '/teacher/sections', '/teacher/topics', '/teacher/lessons'],
  },
  { to: '/teacher/tests', label: 'Testlar', Icon: ClipboardCheck },
  { to: '/teacher/questions', label: 'Savollar', Icon: MessageCircleQuestionMark },
];

export function TeacherNav() {
  return <StaffNav items={ITEMS} label="O'qituvchi navigatsiyasi" />;
}

export default TeacherNav;
