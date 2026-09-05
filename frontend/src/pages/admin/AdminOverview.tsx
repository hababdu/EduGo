import { useAdminOverview } from '../../hooks/useAdmin';

/**
 * Admin panel — student dashboarddan farqli, ma'lumot zich (data-dense)
 * bo'lishi kerak. Lekin bir xil dizayn tokenlari (rang, shrift) davom etadi.
 * Statistikalar bir xil "karta" to'plami sifatida emas, hero raqam +
 * hairline bilan ajratilgan ikkilamchi ro'yxat sifatida ko'rsatiladi —
 * har biri bir xil vaznga ega bo'lmasligi kerak.
 */
export function AdminOverview() {
  const { data, isLoading } = useAdminOverview();

  if (isLoading || !data) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-20 w-48 bg-surface rounded" />
        <div className="h-40 bg-surface rounded" />
      </div>
    );
  }

  const secondaryStats = [
    { label: 'Faol studentlar (7 kun)', value: data.totals.activeStudents },
    { label: 'O\'qituvchilar', value: data.totals.teachers },
    { label: 'Kurslar', value: data.totals.courses },
    { label: 'Fanlar', value: data.totals.subjects },
    { label: 'Testlar', value: data.totals.tests },
    { label: 'Bugungi urinishlar', value: data.today.testAttempts },
  ];

  const maxDaily = Math.max(...data.charts.dailyActiveUsers.map((d) => d.count), 1);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-8">Boshqaruv paneli</h1>

      <div className="mb-10">
        <p className="text-sm text-ink-muted">Jami studentlar</p>
        <p className="font-display text-6xl text-gold mt-1 tabular-nums">
          {data.totals.students.toLocaleString('uz-UZ')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 mb-10 border-t border-white/5 pt-6">
        {secondaryStats.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value.toLocaleString('uz-UZ')}</p>
            <p className="text-xs text-ink-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm text-ink-muted mb-3">Kunlik faollik (7 kun)</p>
        <div className="flex items-end gap-2 h-24">
          {data.charts.dailyActiveUsers.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t bg-teal/70"
                style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[10px] text-ink-faint">{d.date.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
