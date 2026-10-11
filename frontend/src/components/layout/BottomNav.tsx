import { Home, BookOpen, ClipboardList, Users, User } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff/StaffNav';

const items: StaffNavItem[] = [
  { to: '/', Icon: Home, label: 'Bosh sahifa', end: true },
  { to: '/lessons', Icon: BookOpen, label: 'Darslar' },
  { to: '/tests', Icon: ClipboardList, label: 'Testlar' },
  { to: '/groups', Icon: Users, label: 'Guruhlar' },
  { to: '/profile', Icon: User, label: 'Profil' },
];

export function BottomNav() {
  return <StaffNav items={items} label="Asosiy navigatsiya" />;
}
