import { useNavigate } from 'react-router-dom';
import { StaffHero, Panel, KpiCard } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { School, Users, FolderOpen, Sparkles, Activity, FileText } from '../../design/icons';
import { formatBytes } from '../../lib/material-files';
import { num, ROLE_UZ, useSuperOverview, useSuperSystem } from './superApi';

const CFG: [string, string][] = [
  ['botToken', 'Bot tokeni'], ['jwtSecret', 'JWT sir'], ['webappUrl', 'WEBAPP_URL'], ['telegramStorage', 'Fayl saqlash (Telegram)'],
  ['groqKey', 'Groq kaliti'], ['anthropicKey', 'Anthropic kaliti'], ['geminiKey', 'Gemini kaliti'],
];

const Dot = ({ ok }: { ok: boolean }) => <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-teal' : 'bg-coral'}`} />;

function uptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d} kun ${h} soat` : h ? `${h} soat ${m} daq` : `${m} daq`;
}

export function SuperOverview() {
  const nav = useNavigate();
  const { data: o } = useSuperOverview();
  const { data: sys } = useSuperSystem();

  return (
    <div className={PAGE}>
      <StaffHero accent="gold" image={IMAGES.hero} eyebrow="EduGo · Super admin" title="Boshqaruv markazi" subtitle="Maktablar, adminlar, AI va tizim holati — bir joyda." />

      {!o ? <Skeleton className="h-40" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard label="Maktablar" value={o.organizations.active} icon={School} accent="gold" hint={o.organizations.suspended ? `${o.organizations.suspended} ta to'xtatilgan` : undefined} onClick={() => nav('/super/orgs')} />
            <KpiCard label="Foydalanuvchilar" value={num(o.users.total)} icon={Users} accent="sky" hint={`7 kunda faol: ${num(o.users.active7d)}`} onClick={() => nav('/admin/users')} />
            <KpiCard label="Guruhlar" value={num(o.groups)} icon={FolderOpen} accent="teal" onClick={() => nav('/admin/groups')} />
            <KpiCard label="Fayllar" value={formatBytes(o.files.bytes)} icon={FileText} accent="coral" hint={`${num(o.files.count)} ta fayl`} />
            <KpiCard label="AI bugun" value={num(o.aiToday.tokens)} icon={Sparkles} accent="gold" hint={`${num(o.aiToday.requests)} so'rov`} onClick={() => nav('/super/ai')} />
            <KpiCard label="Testlar" value={num(o.tests)} icon={Activity} accent="sky" />
          </div>
          <Panel title="Rollar bo'yicha" icon={Users} accent="sky">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'].map((r) => (
                <div key={r} className="rounded-2xl bg-surface/50 py-3 text-center">
                  <div className="font-display text-xl font-bold text-ink tabular-nums">{num(o.users.roles[r] ?? 0)}</div>
                  <div className="text-[11px] text-ink-muted">{ROLE_UZ[r]}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      <Panel title="Tizim holati" icon={Activity} accent="teal">
        {!sys ? <Skeleton className="h-32" /> : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Server ishlagan', uptime(sys.server.uptimeSec)],
                ['Xotira', `${sys.server.rssMb} MB`],
                ['Baza', sys.db.ok ? `${sys.db.latencyMs} ms` : 'ULANMAGAN'],
                ['Baza hajmi', sys.db.sizeBytes ? formatBytes(sys.db.sizeBytes) : '—'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-surface/50 p-3">
                  <div className="text-[11px] text-ink-muted">{l}</div>
                  <div className={`font-semibold tabular-nums ${l === 'Baza' && !sys.db.ok ? 'text-coral' : 'text-ink'}`}>{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-ink-muted">Sozlamalar</div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {CFG.map(([k, l]) => (
                  <div key={k} className="flex items-center gap-2 text-xs text-ink"><Dot ok={!!sys.config[k]} />{l}</div>
                ))}
                <div className="flex items-center gap-2 text-xs text-ink"><Dot ok={(sys.config.superAdminIds as number) > 0} />Super admin ro'yxati ({String(sys.config.superAdminIds)})</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-ink-muted">Vazifalarni baholash navbati</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ['Baholanmoqda', sys.queue.gradingRunning, false],
                  ['Kutayotgan (muddati o\'tgan)', sys.queue.gradingOverdue, sys.queue.gradingOverdue > 0],
                  ['AI xatosi', sys.queue.failedSubmissions, sys.queue.failedSubmissions > 0],
                  ['Tekshirish kerak', sys.queue.needsReview, false],
                  ['Biriktirilmagan fayl', sys.queue.orphanFiles, false],
                ].map(([l, v, warn]) => (
                  <div key={l as string} className="rounded-2xl bg-surface/50 p-3 text-center">
                    <div className={`font-display text-lg font-bold tabular-nums ${warn ? 'text-coral' : 'text-ink'}`}>{v as number}</div>
                    <div className="text-[10px] leading-tight text-ink-muted">{l as string}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => nav('/admin/students')} className="rounded-2xl border border-white/10 bg-surface/40 py-3 text-sm font-semibold text-ink">Studentlar</button>
        <button type="button" onClick={() => nav('/admin/payments')} className="rounded-2xl border border-white/10 bg-surface/40 py-3 text-sm font-semibold text-ink">To'lovlar</button>
      </div>
    </div>
  );
}
