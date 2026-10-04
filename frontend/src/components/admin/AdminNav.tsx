import { LayoutDashboard, Users, GraduationCap, FolderOpen } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff';

const ITEMS: StaffNavItem[] = [
  { to: '/admin', label: 'Boshqaruv', Icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Foydalanuvchilar', Icon: Users },
  { to: '/admin/students', label: 'Studentlar', Icon: GraduationCap },
  { to: '/admin/groups', label: 'Guruhlar', Icon: FolderOpen },
];

export function AdminNav() {
  return <StaffNav items={ITEMS} label="Admin navigatsiyasi" />;
}
