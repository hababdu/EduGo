import { useAdminOverview } from '../../hooks/useAdmin';

/**
 * Admin panel — ma'lumot zich (data-dense) va vizual tahlillar (charts)
 * bilan boyitilgan boshqaruv paneli.
 */
export function AdminOverview() {
  const { data, isLoading } = useAdminOverview();

  if (isLoading || !data) {
    return (
      <div className="p-6 animate-pulse space-y-4 max-w-3xl mx-auto">
        <div className="h-20 w-48 bg-surface rounded-xl" />
        <div className="h-40 bg-surface rounded-xl" />
        <div className="h-32 bg-surface rounded-xl" />
      </div>
    );
  }

  const secondaryStats = [
    { label: "Faol studentlar (7 kun)", value: data.totals.activeStudents },
    { label: "O'qituvchilar", value: data.totals.teachers },
    { label: "Kurslar", value: data.totals.courses },
    { label: "Fanlar", value: data.totals.subjects },
    { label: "Testlar", value: data.totals.tests },
    { label: "Bugungi urinishlar", value: data.today.testAttempts },
  ];

  // TypeScript xatoligini oldini olish uchun any tipiga o'tkazamiz
  const charts = data.charts as any;
  const maxDailyUsers = Math.max(...(charts?.dailyActiveUsers?.map((d: any) => d.count) || [1]), 1);
  const dailyAttempts = charts?.dailyAttempts || charts?.dailyActiveUsers || [];
  const maxDailyAttempts = Math.max(...(dailyAttempts.map((d: any) => d.count || d.attempts || 0) || [1]), 1);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-10">
      {/* Sarlavha */}
      <h1 className="font-display text-2xl">Boshqaruv paneli</h1>

      {/* Hero raqam */}
      <div>
        <p className="text-sm text-ink-muted">Jami studentlar</p>
        <p className="font-display text-6xl text-gold mt-1 tabular-nums">
          {data.totals.students.toLocaleString('uz-UZ')}
        </p>
      </div>

      {/* Ikkilamchi statistika ro'yxati */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 border-t border-white/5 pt-6">
        {secondaryStats.map((stat) => (
          <div key={stat.label} className="bg-surface/30 p-4 rounded-2xl border border-white/5">
            <p className="text-2xl font-semibold tabular-nums">{stat.value.toLocaleString('uz-UZ')}</p>
            <p className="text-xs text-ink-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Vizual Diagrammalar (Charts) Gridi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/5 pt-8">
        
        {/* 1-diagramma: Kunlik faollik (DAU) */}
        <div className="bg-surface/20 p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Kunlik faollik</p>
            <span className="text-[10px] text-ink-muted bg-surface px-2 py-0.5 rounded-full">So'nggi 7 kun</span>
          </div>
          <div className="flex items-end gap-2 h-28 pt-2">
            {charts?.dailyActiveUsers?.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full rounded-t bg-teal/70 hover:bg-teal transition-colors"
                  style={{ height: `${Math.max(6, (d.count / maxDailyUsers) * 100)}%` }}
                  title={`${d.date}: ${d.count} ta faol`}
                />
                <span className="text-[10px] text-ink-faint">{d.date.slice(8, 10)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2-diagramma: Test topshirish urinishlari */}
        <div className="bg-surface/20 p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Test urinishlari</p>
            <span className="text-[10px] text-ink-muted bg-surface px-2 py-0.5 rounded-full">Dinamika</span>
          </div>
          <div className="flex items-end gap-2 h-28 pt-2">
            {dailyAttempts.map((d: any, idx: number) => {
              const val = d.count ?? d.attempts ?? 0;
              return (
                <div key={d.date || idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full rounded-t bg-gold/70 hover:bg-gold transition-colors"
                    style={{ height: `${Math.max(6, (val / maxDailyAttempts) * 100)}%` }}
                    title={`${d.date || 'Kun'}: ${val} ta urinish`}
                  />
                  <span className="text-[10px] text-ink-faint">{(d.date || '').slice(8, 10) || `#${idx+1}`}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}