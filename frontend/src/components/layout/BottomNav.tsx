import { Home, Users, User, School } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff/StaffNav';
import { useEducationFeatures } from '../../hooks/useEducationFeatures';

const items: StaffNavItem[] = [
  { to: '/', Icon: Home, label: 'Bosh sahifa', end: true },
  { to: '/groups', Icon: Users, label: 'Guruhlar' },
  { to: '/schools', Icon: School, label: 'Maktab' },
  { to: '/profile', Icon: User, label: 'Profil' },
];

export function BottomNav() {
  const { enabled } = useEducationFeatures();
  const visibleItems = items.filter((item) => item.to !== '/groups' || enabled('GROUPS'));
  return <StaffNav items={visibleItems} label="Asosiy navigatsiya" />;
}
