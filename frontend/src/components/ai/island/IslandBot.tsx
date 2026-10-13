import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { MOOD, type EyeShape, type IslandMood } from './moods';
import { OutfitLayer, type OutfitId } from './outfits';

/* Robot yuzi (o'z dizaynimiz): sig'imli bosh, ikki ko'z, kursorni kuzatadi, ko'z qisadi,
   hissiyotga qarab ko'z shakli, nur va zarrachalar o'zgaradi. */

const EYE_X = [40, 80] as const;
const EYE_Y = 38;
const FILL = '#F6F3EA';

function Eye({ shape, side }: { shape: EyeShape; side: 0 | 1 }) {
  const s: EyeShape = shape === 'wink' ? (side === 1 ? 'happy' : 'pill') : shape;
  const stroke = { fill: 'none', stroke: FILL, strokeWidth: 4, strokeLinecap: 'round' as const };
  switch (s) {
    case 'pill': return <rect x={-6} y={-11} width={12} height={22} rx={6} fill={FILL} />;
    case 'wide': return <rect x={-7.5} y={-14} width={15} height={28} rx={7.5} fill={FILL} />;
    case 'dot': return <circle r={6} fill={FILL} />;
    case 'line': return <rect x={-9} y={-1.5} width={18} height={3.2} rx={1.6} fill={FILL} />;
    case 'happy': return <path d="M-9 5 Q0 -10 9 5" {...stroke} />;
    case 'closed': return <path d="M-9 -3 Q0 8 9 -3" {...stroke} />;
    case 'tired': return <path d="M-8 -1 H8 a8 8 0 0 1 -16 0Z" fill={FILL} />;
    case 'heart': return <path d="M0 9 C-13 -2 -8 -12 0 -5 C8 -12 13 -2 0 9Z" fill="#FF6B8B" className="bot-beat" />;
    case 'star': return <polygon points="0,-12 3.2,-4 12,-3.5 5.3,2.5 7.4,11 0,6.3 -7.4,11 -5.3,2.5 -12,-3.5 -3.2,-4" fill="#FFD54A" />;
    case 'spiral':
      return (
        <path
          className="bot-spin"
          d="M0 0 a2 2 0 1 1 4 0 a4 4 0 1 1 -8 0 a6 6 0 1 1 12 0 a8 8 0 1 1 -16 0"
          fill="none" stroke={FILL} strokeWidth={2} strokeLinecap="round"
        />
      );
    default: return null;
  }
}

function Particles({ mood }: { mood: IslandMood }) {
  if (mood === 'love')
    return (
      <>
        {[0, 1, 2].map((i) => (
          <path key={i} className="bot-float" style={{ animationDelay: `${i * 0.55}s`, transformBox: 'fill-box' }}
            d={`M${44 + i * 16} 6 c-4 -4 -9 1 -4 6 l4 3.5 l4 -3.5 c5 -5 0 -10 -4 -6Z`} fill="#FF6B8B" />
        ))}
      </>
    );
  if (mood === 'sleeping')
    return (
      <>
        {[0, 1].map((i) => (
          <text key={i} className="bot-float" x={96 + i * 8} y={10 - i * 8} fontSize={12 - i * 2} fontWeight={700}
            fill={FILL} style={{ animationDelay: `${i * 0.9}s` }}>z</text>
        ))}
      </>
    );
  if (mood === 'proud' || mood === 'finished')
    return (
      <>
        {[0, 1, 2].map((i) => (
          <polygon key={i} className="bot-float" style={{ animationDelay: `${i * 0.35}s` }}
            points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5"
            transform={`translate(${30 + i * 30} 4)`} fill="#FFD54A" />
        ))}
      </>
    );
  if (mood === 'error')
    return <path className="bot-float" d="M100 14 q4 6 0 9 q-4 -3 0 -9Z" fill="#60A5FA" />;
  return null;
}

function BadgeMark({ mood }: { mood: IslandMood }) {
  const b = MOOD[mood].badge;
  if (!b) return null;
  if (b === 'dots')
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={96 + i * 7} cy={4} r={2.2} fill={FILL} className="bot-dot" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </g>
    );
  return (
    <g>
      <circle cx={104} cy={6} r={8} fill={MOOD[mood].glow} />
      <text x={104} y={10} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0B1020">
        {b === 'bang' ? '!' : '?'}
      </text>
    </g>
  );
}

function Box() {
  return (
    <g className="bot-wobble" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <rect x={28} y={20} width={64} height={44} rx={5} fill="#C99A5B" stroke="#8A6330" strokeWidth={1.5} />
      <rect x={24} y={12} width={72} height={13} rx={4} fill="#D9AE72" stroke="#8A6330" strokeWidth={1.5} />
      <rect x={54} y={12} width={12} height={52} fill="#F6F3EA" fillOpacity={0.55} />
      <path d="M44 38 q3 3 6 0 M70 38 q3 3 6 0" fill="none" stroke="#5B3F18" strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

interface Props {
  mood?: IslandMood;
  outfit?: OutfitId;
  /** Kenglik (px); balandlik avtomatik */
  size?: number;
  /** Kursor/barmoq tomon qarab turadimi */
  track?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function IslandBot({ mood = 'idle', outfit = 'none', size = 64, track = true, className = '', style }: Props) {
  const cfg = MOOD[mood];
  const svgRef = useRef<SVGSVGElement>(null);
  const gid = useId().replace(/:/g, '');

  useEffect(() => {
    if (!track) return;
    const el = svgRef.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(120, window.innerWidth * 0.5);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(120, window.innerHeight * 0.5);
      el.style.setProperty('--lx', String(Math.max(-1, Math.min(1, dx)) * 6));
      el.style.setProperty('--ly', String(Math.max(-1, Math.min(1, dy)) * 3.5));
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [track]);

  const lookless = mood === 'sleeping' || mood === 'dizzy' || mood === 'box';
  const blink = cfg.eye === 'pill' || cfg.eye === 'wide' || cfg.eye === 'dot' || cfg.eye === 'wink';

  return (
    <svg
      ref={svgRef}
      viewBox="0 -16 120 88"
      width={size}
      height={(size * 88) / 120}
      role="img"
      aria-label="AI yordamchi"
      className={`bot ${cfg.bounce ? 'bot-bounce' : ''} ${className}`}
      style={{ overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={`h${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#222C4E" />
          <stop offset="1" stopColor="#11172B" />
        </linearGradient>
        <radialGradient id={`g${gid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={cfg.glow} stopOpacity={cfg.glowOpacity} />
          <stop offset="1" stopColor={cfg.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={60} cy={38} rx={74} ry={50} fill={`url(#g${gid})`} className="bot-glow" />

      <g style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', transform: `rotate(${cfg.tilt ?? 0}deg)`, transition: 'transform .3s cubic-bezier(.34,1.5,.64,1)' }}>
        {mood === 'box' ? (
          <Box />
        ) : (
          <>
            <rect x={3} y={30} width={5} height={16} rx={2.5} fill="#2B3659" />
            <rect x={112} y={30} width={5} height={16} rx={2.5} fill="#2B3659" />
            <rect x={6} y={8} width={108} height={60} rx={30} fill={`url(#h${gid})`} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={1.5} />
            <rect x={14} y={14} width={92} height={48} rx={24} fill="#0B1020" fillOpacity={0.55} />
            {EYE_X.map((x, i) => (
              <g
                key={x}
                transform={`translate(${x} ${EYE_Y})`}
              >
                <g style={lookless ? undefined : { transform: 'translate(calc(var(--lx, 0) * 1px), calc(var(--ly, 0) * 1px))', transition: 'transform .12s linear' }}>
                  <g className={blink ? 'bot-blink' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                    <Eye shape={cfg.eye} side={i as 0 | 1} />
                  </g>
                </g>
              </g>
            ))}
            {(mood === 'love' || mood === 'happy' || mood === 'proud' || mood === 'finished') && (
              <>
                <ellipse cx={26} cy={50} rx={7} ry={3.5} fill="#FF6B8B" fillOpacity={0.35} />
                <ellipse cx={94} cy={50} rx={7} ry={3.5} fill="#FF6B8B" fillOpacity={0.35} />
              </>
            )}
            {mood === 'yawn' && <ellipse cx={60} cy={55} rx={6} ry={4.5} fill="#0B1020" stroke={FILL} strokeWidth={1.6} />}
            <OutfitLayer outfit={outfit} />
          </>
        )}
      </g>

      <Particles mood={mood} />
      <BadgeMark mood={mood} />
    </svg>
  );
}
