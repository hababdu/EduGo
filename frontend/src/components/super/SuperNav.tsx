import { LayoutDashboard, School, Users, Settings2, BookOpen } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff';

const ITEMS: StaffNavItem[] = [
  { to: '/super', label: 'Umumiy', Icon: LayoutDashboard, end: true },
  { to: '/super/orgs', label: 'Tashkilotlar', Icon: School, match: ['/super/orgs', '/super/billing'] },
  { to: '/super/catalog', label: 'Ta’lim katalogi', Icon: BookOpen },
  { to: '/super/admins', label: 'Foydalanuvchilar', Icon: Users },
  { to: '/super/ai', label: 'Tizim', Icon: Settings2, match: ['/super/ai', '/super/audit'] },
];

export function SuperNav() {
  return <StaffNav items={ITEMS} label="Super admin navigatsiyasi" />;
}
