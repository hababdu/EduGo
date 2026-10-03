// So'nggi test natijalari: ustunli diagramma (yengil SVG — tashqi kutubxonasiz).
export interface ResultPoint {
  testTitle: string;
  percent: number;
  passed: boolean;
}

interface ResultsChartProps {
  results: ResultPoint[];
}

const W = 320;
const H = 130;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

export function ResultsChart({ results }: ResultsChartProps) {
  const data = results.slice(0, 7);
  if (data.length === 0) return null;

  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const slot = (W - PAD_X * 2) / data.length;
  const barW = Math.min(28, slot * 0.55);
  const avg = Math.round(data.reduce((a, r) => a + clamp(r.percent), 0) / data.length);

  return (
    <section className="px-5">
      <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink">So'nggi natijalar</h2>
          <span className="text-xs text-ink-muted">
            o'rtacha <span className="text-teal font-semibold tabular-nums">{avg}%</span>
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`So'nggi ${data.length} ta test natijasi, o'rtacha ${avg} foiz`}
        >
          {[0, 50, 100].map((g) => {
            const y = PAD_TOP + plotH - (g / 100) * plotH;
            return (
              <g key={g}>
                <line x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="rgb(255 255 255 / 0.07)" strokeDasharray="3 4" />
                <text x={PAD_X} y={y - 3} fontSize="8" fill="rgb(156 163 196)">
                  {g}%
                </text>
              </g>
            );
          })}
          {data.map((r, i) => {
            const p = clamp(r.percent);
            const h = Math.max(2, (p / 100) * plotH);
            const x = PAD_X + slot * i + (slot - barW) / 2;
            const y = PAD_TOP + plotH - h;
            return (
              <g key={i}>
                <title>{`${r.testTitle}: ${p}%`}</title>
                <rect x={x} y={y} width={barW} height={h} rx="6" fill={r.passed ? '#34D0A0' : '#F0654B'} opacity="0.9" />
                <text x={x + barW / 2} y={y - 3} fontSize="9" fontWeight="600" textAnchor="middle" fill="#F5F3ED">
                  {p}
                </text>
                <text x={x + barW / 2} y={H - 7} fontSize="8" textAnchor="middle" fill="rgb(156 163 196)">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
}
