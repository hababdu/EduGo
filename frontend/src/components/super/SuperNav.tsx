import { LayoutDashboard, School, ShieldCheck, Sparkles, ScrollText, Wallet } from 'lucide-react';
import { StaffNav, StaffNavItem } from '../staff';

const ITEMS: StaffNavItem[] = [
  { to: '/super', label: 'Umumiy', Icon: LayoutDashboard, end: true },
  { to: '/super/orgs', label: 'Maktablar', Icon: School },
  { to: '/super/billing', label: 'Obunalar', Icon: Wallet },
  { to: '/super/admins', label: 'Adminlar', Icon: ShieldCheck },
  { to: '/super/ai', label: 'AI', Icon: Sparkles },
  { to: '/super/audit', label: 'Jurnal', Icon: ScrollText },
];

export function SuperNav() {
  return <StaffNav items={ITEMS} label="Super admin navigatsiyasi" />;
}
