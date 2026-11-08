import { Home, Users, User, School } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff/StaffNav';

const items: StaffNavItem[] = [
  { to: '/', Icon: Home, label: 'Bosh sahifa', end: true },
  { to: '/groups', Icon: Users, label: 'Guruhlar' },
  { to: '/schools', Icon: School, label: 'Maktab' },
  { to: '/profile', Icon: User, label: 'Profil' },
];

export function BottomNav() {
  return <StaffNav items={items} label="Asosiy navigatsiya" />;
}
