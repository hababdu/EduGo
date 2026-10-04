import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, FolderOpen, ClipboardCheck, BookOpen, Layers, Activity, Award, ShieldCheck } from '../../design/icons';
import { useAdminOverview } from '../../hooks/useAdmin';
import { IMAGES } from '../../design/images';
import { StaffHero, Panel, KpiCard, MiniBars, ProgressBar, TodayLessons } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { PAGE_WIDE, CONTROL } from '../../design/tokens';

const fmt = (n: number) => n.toLocaleString('uz-UZ');

/** Admin boshqaruv paneli: hero, asosiy ko'rsatkichlar, faollik diagrammasi, tezkor o'tishlar. */
export function AdminOverview() {
  const { data, isLoading } = useAdminOverview();
  const navigate = useNavigate();

  if (isLoading || !data) {
    return (
      <div className={PAGE_WIDE}>
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  const { totals, today, charts } = data;
  const activeShare = totals.students > 0 ? Math.round((totals.activeStudents / totals.students) * 100) : 0;
  const days = (charts?.dailyActiveUsers ?? []).map((d) => ({
    label: d.date.slice(8, 10),
    value: d.count,
    title: `${d.date}: ${d.count} ta faol`,
  }));

  const shortcuts = [
    { label: 'Foydalanuvchilar va rollar', hint: "Rol berish, bloklash", icon: Users, to: '/admin/users' },
    { label: 'Studentlar', hint: "Qidirish va natijalari", icon: GraduationCap, to: '/admin/students' },
    { label: 'Guruhlar', hint: "Sig'im, davomat, o'qituvchi", icon: FolderOpen, to: '/admin/groups' },
  ];

  return (
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="sky"
        image={IMAGES.hero}
        eyebrow="EduGo · Administrator"
        title="Boshqaruv paneli"
        subtitle="Foydalanuvchilar, guruhlar va o'quv jarayonining umumiy holati."
        actions={
          <button type="button" onClick={() => navigate('/admin/users')} className={CONTROL.buttonPrimary}>
            A'zolarni boshqarish
          </button>
        }
        footer={
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1">
            <div>
              <p className="text-[11px] text-ink-muted">Jami studentlar</p>
              <p className="font-display text-4xl font-extrabold text-gold tabular-nums leading-none mt-1">{fmt(totals.students)}</p>
            </div>
            <div className="min-w-[160px] flex-1 max-w-xs">
              <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1.5">
                <span>7 kunda faol</span>
                <span className="font-semibold text-teal tabular-nums">{activeShare}%</span>
              </div>
              <ProgressBar value={activeShare} tone="teal" />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Faol studentlar" value={fmt(totals.activeStudents)} icon={Activity} accent="teal" hint="so'nggi 7 kun" />
        <KpiCard label="O'qituvchilar" value={fmt(totals.teachers)} icon={ShieldCheck} accent="gold" hint="faol mentorlar" />
        <KpiCard label="Bugungi urinishlar" value={fmt(today.testAttempts)} icon={ClipboardCheck} accent="sky" hint="test topshirishlar" />
        <KpiCard label="Berilgan ball" value={fmt(totals.totalScoreIssued)} icon={Award} accent="coral" hint="jami" />
      </div>

      <TodayLessons basePath="/admin/groups" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Panel title="Kunlik faollik" icon={Activity} accent="teal" className="lg:col-span-3" action={<span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-muted">So'nggi 7 kun</span>}>
          <MiniBars data={days} color="teal" />
        </Panel>

        <Panel title="Kontent" icon={Layers} accent="gold" className="lg:col-span-2">
          <dl className="space-y-3 text-sm">
            {[
              { k: 'Kurslar', v: totals.courses, Icon: BookOpen },
              { k: 'Fanlar', v: totals.subjects, Icon: Layers },
              { k: 'Testlar', v: totals.tests, Icon: ClipboardCheck },
              { k: 'Yakunlangan testlar', v: totals.completedTests, Icon: Award },
            ].map(({ k, v, Icon }) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-muted">
                  <Icon className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                  {k}
                </dt>
                <dd className="font-semibold tabular-nums text-ink">{fmt(v)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="Tezkor o'tish" icon={FolderOpen} accent="sky" flush>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5">
          {shortcuts.map(({ label, hint, icon: Icon, to }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="flex items-center gap-3 bg-surface/60 p-4 text-left transition hover:bg-surface/90 active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky/10 text-sky">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                <span className="block truncate text-[11px] text-ink-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
