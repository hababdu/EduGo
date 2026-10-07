// Reytingdagi birinchi uchlik: o'rtada 1-o'rin balandroq.
export interface PodiumEntry {
  studentId: string;
  firstName: string;
  totalScore: number;
  rank: number;
}

interface PodiumProps {
  entries: PodiumEntry[]; // reyting bo'yicha tartiblangan; faqat dastlabki 3 tasi ishlatiladi
  currentUserId?: string;
}

const STYLE: Record<number, { medal: string; h: string; ring: string; text: string }> = {
  1: { medal: '🥇', h: 'h-24', ring: 'border-gold/60 bg-gold/15', text: 'text-gold' },
  2: { medal: '🥈', h: 'h-16', ring: 'border-white/15 bg-white/[0.06]', text: 'text-ink' },
  3: { medal: '🥉', h: 'h-12', ring: 'border-coral/40 bg-coral/10', text: 'text-coral' },
};

export function Podium({ entries, currentUserId }: PodiumProps) {
  const top = entries.slice(0, 3);
  if (top.length < 3) return null; // kamida 3 ishtirokchi bo'lmasa — oddiy ro'yxat

  // ko'rsatish tartibi: 2, 1, 3
  const order = [top[1], top[0], top[2]];

  return (
    <div className="grid grid-cols-3 gap-2 items-end mb-6" role="list" aria-label="Eng yaxshi uchlik">
      {order.map((e) => {
        const st = STYLE[e.rank] ?? STYLE[3];
        const isSelf = e.studentId === currentUserId;
        return (
          <div key={e.studentId} role="listitem" className="flex flex-col items-center text-center min-w-0">
            <span className="text-2xl" aria-hidden="true">{st.medal}</span>
            <p className="text-xs font-semibold text-ink truncate max-w-full mt-0.5">
              {e.firstName}
              {isSelf && <span className="text-gold"> (siz)</span>}
            </p>
            <p className={`text-sm font-display font-bold tabular-nums ${st.text}`}>{e.totalScore}</p>
            <div
              className={`mt-1.5 w-full ${st.h} rounded-t-2xl border border-b-0 ${st.ring} flex items-start justify-center pt-1.5`}
            >
              <span className="text-xs font-bold text-ink-muted">{e.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
