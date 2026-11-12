import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';
import { PAGE_WIDE } from '../../design/tokens';
import {
  UserRound, Phone, AtSign, ShieldCheck, School, Users,
  BookOpen, ClipboardCheck, CalendarDays, ChevronRight,
} from 'lucide-react';

interface TeacherProfileData {
  id: string;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  phone?: string | null;
  role: string;
  profilePhotoUrl?: string | null;
}

interface TeacherOverviewData {
  groupsCount: number;
  studentsCount: number;
  assignedTestsCount: number;
  assignmentsCount: number;
}

function useTeacherProfile() {
  return useQuery({
    queryKey: ['teacher', 'profile'],
    queryFn: () => apiFetch<TeacherProfileData>('/api/v1/users/me'),
    staleTime: 60_000,
  });
}

function useTeacherProfileStats() {
  return useQuery({
    queryKey: ['teacher', 'profile', 'stats'],
    queryFn: () => apiFetch<TeacherOverviewData>('/api/v1/teacher/overview'),
    staleTime: 60_000,
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-tint/5 last:border-0">
      <span className="w-9 h-9 rounded-xl bg-tint/5 text-ink-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-ink-muted">{label}</p>
        <p className="text-sm text-ink font-medium truncate">{value || 'Kiritilmagan'}</p>
      </div>
    </div>
  );
}

export function TeacherProfile() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const profile = useTeacherProfile();
  const stats = useTeacherProfileStats();

  if (profile.isLoading) {
    return <div className={PAGE_WIDE}><div className="h-36 rounded-3xl bg-surface/30 animate-pulse" /><div className="h-64 rounded-3xl bg-surface/20 animate-pulse mt-4" /></div>;
  }

  if (profile.error || !profile.data) {
    return (
      <div className={PAGE_WIDE}>
        <div className="rounded-3xl border border-tint/10 bg-surface/30 p-6 text-center">
          <p className="font-semibold text-ink">Profilni yuklab bo‘lmadi</p>
          <p className="text-sm text-ink-muted mt-2">{(profile.error as Error)?.message || 'Server bilan bog‘lanishda muammo'}</p>
          <button type="button" onClick={() => profile.refetch()} className="mt-4 rounded-xl bg-accent/15 px-4 py-2 text-sm text-accent">Qayta urinish</button>
        </div>
      </div>
    );
  }

  const user = profile.data;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'O‘qituvchi';
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const shortcuts = [
    { label: 'Guruhlarim', description: 'Biriktirilgan guruhlar va o‘quvchilar', icon: Users, path: '/teacher/groups' },
    { label: 'Dars jadvali', description: 'Dars kunlari va vaqtlar', icon: CalendarDays, path: '/teacher/timetable' },
    { label: 'Materiallar', description: 'Dars materiallari va vazifalar', icon: BookOpen, path: '/teacher/content/courses' },
    { label: 'Testlar', description: 'Testlar va savollar bazasi', icon: ClipboardCheck, path: '/teacher/tests' },
  ];

  return (
    <div className={PAGE_WIDE}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.16em] text-accent font-semibold">O‘qituvchi kabineti</p>
        <h1 className="font-display text-2xl sm:text-3xl text-ink mt-1">Mening profilim</h1>
        <p className="text-sm text-ink-muted mt-1">Shaxsiy hisobingiz va ish faoliyatingiz haqida ma’lumot.</p>
      </div>

      <section className="rounded-3xl border border-tint/10 bg-surface/35 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent flex items-center justify-center text-xl font-semibold shrink-0">{initials}</div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-ink truncate">{fullName}</h2>
            <p className="text-sm text-ink-muted mt-0.5">O‘qituvchi</p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-teal/10 text-teal px-2.5 py-1 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Hisob faol
            </span>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-tint/10 bg-surface/25 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <UserRound className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-ink">Shaxsiy ma’lumotlar</h2>
        </div>
        <InfoRow icon={UserRound} label="Ism-familiya" value={fullName} />
        <InfoRow icon={AtSign} label="Foydalanuvchi nomi" value={user.username ? `@${user.username}` : null} />
        <InfoRow icon={Phone} label="Telefon raqami" value={user.phone} />
        <InfoRow icon={ShieldCheck} label="Hisob turi" value="O‘qituvchi" />
        <p className="text-xs text-ink-faint mt-3">Ma’lumotlar hisobingizdan o‘qish rejimida ko‘rsatilmoqda. Tahrirlash API imkoniyati tekshirilmaguncha o‘zgartirish tugmalari qo‘shilmadi.</p>
      </section>

      <section className="mt-4 rounded-3xl border border-tint/10 bg-surface/25 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <School className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-ink">Ish faoliyati</h2>
        </div>
        {stats.isLoading ? <div className="h-20 rounded-2xl bg-surface/40 animate-pulse" /> : stats.data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Guruhlar', stats.data.groupsCount],
              ['O‘quvchilar', stats.data.studentsCount],
              ['Materiallar', stats.data.assignmentsCount],
              ['Biriktirilgan testlar', stats.data.assignedTestsCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-tint/[0.035] p-3">
                <p className="text-2xl font-display text-ink tabular-nums">{value}</p>
                <p className="text-[11px] text-ink-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-ink-muted">Faoliyat statistikasi hozircha yuklanmadi.</p>}
      </section>

      <section className="mt-4 rounded-3xl border border-tint/10 bg-surface/25 p-4 sm:p-5">
        <h2 className="font-semibold text-ink mb-2">Ish bo‘limlari</h2>
        <div className="divide-y divide-tint/5">
          {shortcuts.map(({ label, description, icon: Icon, path }) => (
            <button key={path} type="button" onClick={() => { haptic('light'); navigate(path); }} className="w-full flex items-center gap-3 py-3 text-left">
              <span className="w-9 h-9 rounded-xl bg-tint/5 text-ink-muted flex items-center justify-center"><Icon className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{label}</span><span className="block text-xs text-ink-muted mt-0.5">{description}</span></span>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default TeacherProfile;
