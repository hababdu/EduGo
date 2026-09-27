import React, { useId, useEffect, useRef, useState } from 'react';

export type MascotMood =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'wave'
  | 'run'
  | 'thinking'
  | 'sleep'
  | 'loading'
  | 'success'
  | 'error';

interface MascotSVGProps {
  mood?: MascotMood;
  size?: number;
  /** When true, the head and eyes track the mouse cursor across the viewport. */
  interactive?: boolean;
  className?: string;
}

const COLORS = {
  bodyLight: '#F6F2EA',
  bodyMid: '#E4DBCB',
  bodyDark: '#C7BBA3',
  bodyStroke: '#A6987C',
  orange: '#E08A3C',
  orangeDark: '#B96A22',
  cyan: '#22C3E6',
  cyanLight: '#9AF3FF',
  cyanDark: '#0E93B3',
  visor: '#12151C',
  visorRim: '#2A2F3A',
  red: '#E8574A',
  redDark: '#A83A30',
  green: '#3FCB7E',
  greenDark: '#1F9E5C',
  shadow: '#000',
} as const;

export function MascotSVG({
  mood = 'idle',
  size = 64,
  interactive = false,
  className = '',
}: MascotSVGProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!interactive) return;
    function handleMove(e: MouseEvent) {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      setGaze({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy)),
      });
    }
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [interactive]);

  const eyeGrad = `mascot-eye-${uid}`;
  const bodyGrad = `mascot-body-${uid}`;
  const visorGrad = `mascot-visor-${uid}`;
  const shineGrad = `mascot-shine-${uid}`;
  const softGlow = `mascot-glow-${uid}`;
  const errorGrad = `mascot-error-${uid}`;
  const successGrad = `mascot-success-${uid}`;

  const sleeping = mood === 'sleep';
  const erroring = mood === 'error';
  const succeeding = mood === 'success';
  const thinking = mood === 'thinking';
  const loading = mood === 'loading';

  const headTilt = interactive ? gaze.x * 5 : 0;
  const eyeShiftX = interactive ? gaze.x * 3.2 : 0;
  const eyeShiftY = interactive ? gaze.y * 2.2 : 0;

  const eyeColor = erroring ? COLORS.red : COLORS.cyan;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={`mascot mascot--${mood}`}
      style={
        {
          '--gaze-head': `${headTilt}deg`,
          '--gaze-eye-x': `${eyeShiftX}px`,
          '--gaze-eye-y': `${eyeShiftY}px`,
        } as React.CSSProperties
      }
      data-classname={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Eye / chest-core glow */}
        <radialGradient id={eyeGrad} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor={COLORS.cyanLight} />
          <stop offset="75%" stopColor={eyeColor} />
          <stop offset="100%" stopColor={erroring ? COLORS.redDark : COLORS.cyanDark} />
        </radialGradient>

        <radialGradient id={successGrad} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#B9FCD3" />
          <stop offset="100%" stopColor={COLORS.green} />
        </radialGradient>

        <radialGradient id={errorGrad} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFEDEA" />
          <stop offset="45%" stopColor="#FF9E8E" />
          <stop offset="100%" stopColor={COLORS.redDark} />
        </radialGradient>

        {/* Brushed-metal body gradient */}
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.bodyLight} />
          <stop offset="55%" stopColor={COLORS.bodyMid} />
          <stop offset="100%" stopColor={COLORS.bodyDark} />
        </linearGradient>

        {/* Glass visor gradient */}
        <linearGradient id={visorGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.visorRim} />
          <stop offset="100%" stopColor={COLORS.visor} />
        </linearGradient>

        {/* Diagonal specular highlight used on the helmet/torso */}
        <linearGradient id={shineGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id={softGlow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse className="mascot__shadow" cx="60" cy="132" rx="26" ry="5" fill={COLORS.shadow} opacity="0.18" />

      {/* Legs */}
      <g className="mascot__leg mascot__leg--left">
        <rect x="40" y="92" width="16" height="28" rx="7" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
        <path d="M36 116h24a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6z" fill={COLORS.orange} />
        <rect x="34" y="116" width="28" height="5" rx="2.5" fill={COLORS.cyan} opacity="0.8" />
      </g>
      <g className="mascot__leg mascot__leg--right">
        <rect x="64" y="92" width="16" height="28" rx="7" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
        <path d="M60 116h24a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4H58a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6z" fill={COLORS.orange} />
        <rect x="58" y="116" width="28" height="5" rx="2.5" fill={COLORS.cyan} opacity="0.8" />
      </g>

      {/* Torso */}
      <g className="mascot__torso">
        <rect x="34" y="62" width="52" height="38" rx="16" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
        <rect x="34" y="62" width="52" height="38" rx="16" fill={`url(#${shineGrad})`} />

        <rect x="46" y="70" width="28" height="6" rx="3" fill={COLORS.orange} opacity="0.9" />

        {/* Chest core — pulses for loading, flashes green/red for success/error */}
        <g filter={`url(#${softGlow})`}>
          <circle
            className="mascot__chest-light"
            cx="60"
            cy="86"
            r="6"
            fill={succeeding ? `url(#${successGrad})` : erroring ? `url(#${errorGrad})` : `url(#${eyeGrad})`}
          />
        </g>
        <circle cx="60" cy="86" r="9" fill="none" stroke={erroring ? COLORS.red : COLORS.cyan} strokeWidth="1.5" opacity="0.5" />
        {loading && (
          <circle
            className="mascot__chest-ring"
            cx="60"
            cy="86"
            r="12"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="10 40"
          />
        )}

        <g className="mascot__arm mascot__arm--left">
          <rect x="24" y="68" width="13" height="26" rx="6.5" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
          <circle cx="30.5" cy="96" r="7" fill={COLORS.orange} />
          <circle cx="30.5" cy="96" r="2.4" fill={COLORS.cyan} />
        </g>
        <g className="mascot__arm mascot__arm--right">
          <rect x="83" y="68" width="13" height="26" rx="6.5" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
          <circle cx="89.5" cy="96" r="7" fill={COLORS.orange} />
          <circle cx="89.5" cy="96" r="2.4" fill={COLORS.cyan} />
        </g>
      </g>

      {/* Head */}
      <g className="mascot__head">
        <circle cx="27" cy="46" r="9" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
        <circle cx="93" cy="46" r="9" fill={`url(#${bodyGrad})`} stroke={COLORS.bodyStroke} strokeWidth="1.5" />
        <circle cx="27" cy="46" r="3.2" fill={COLORS.cyan} opacity="0.85" />
        <circle cx="93" cy="46" r="3.2" fill={COLORS.cyan} opacity="0.85" />

        <path
          d="M60 8 C82 8 96 24 96 44 C96 60 88 66 60 66 C32 66 24 60 24 44 C24 24 38 8 60 8 Z"
          fill={`url(#${bodyGrad})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />
        <path
          d="M60 8 C82 8 96 24 96 44 C96 60 88 66 60 66 C32 66 24 60 24 44 C24 24 38 8 60 8 Z"
          fill={`url(#${shineGrad})`}
        />

        <rect className="mascot__antenna" x="48" y="12" width="24" height="5" rx="2.5" fill={COLORS.orange} />
        <circle className="mascot__antenna-tip" cx="60" cy="12" r="3.2" fill={COLORS.cyanLight} opacity="0" />

        <rect x="34" y="34" width="52" height="26" rx="13" fill={`url(#${visorGrad})`} />
        <rect x="34" y="34" width="52" height="26" rx="13" fill="none" stroke={COLORS.orange} strokeWidth="2" />

        <g className="mascot__eyes">
          {sleeping ? (
            <>
              <path d="M43 47 q6 5 12 0" stroke={COLORS.cyan} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
              <path d="M65 47 q6 5 12 0" stroke={COLORS.cyan} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
            </>
          ) : (
            <>
              <circle cx="49" cy="47" r="7" fill={erroring ? `url(#${errorGrad})` : `url(#${eyeGrad})`} />
              <circle cx="71" cy="47" r="7" fill={erroring ? `url(#${errorGrad})` : `url(#${eyeGrad})`} />
              <circle cx="47" cy="45" r="2" fill="#fff" opacity="0.9" />
              <circle cx="69" cy="45" r="2" fill="#fff" opacity="0.9" />
            </>
          )}
        </g>

        {sleeping && (
          <text x="86" y="18" fontSize="10" fill={COLORS.cyanLight} className="mascot__zzz" opacity="0">Z</text>
        )}
      </g>

      <style>{`
        .mascot { overflow: visible; display: block; }
        .mascot__head, .mascot__torso { transform-box: fill-box; transform-origin: center; }
        .mascot__leg--left { transform-box: fill-box; transform-origin: 48px 92px; }
        .mascot__leg--right { transform-box: fill-box; transform-origin: 72px 92px; }
        .mascot__arm--left { transform-box: fill-box; transform-origin: 36px 70px; }
        .mascot__arm--right { transform-box: fill-box; transform-origin: 84px 70px; }
        .mascot__eyes { transform-box: fill-box; transform-origin: center; }
        .mascot__chest-ring { transform-box: fill-box; transform-origin: center; }

        /* Cursor tracking sits underneath the mood animation via CSS var, applied
           as an extra translate/rotate through a wrapping transform on the head. */
        .mascot__head {
          transform: translate(var(--gaze-eye-x, 0px), 0) rotate(var(--gaze-head, 0deg));
        }
        .mascot__eyes {
          transform: translate(var(--gaze-eye-x, 0px), var(--gaze-eye-y, 0px));
        }

        /* ================= IDLE ================= */
        .mascot--idle .mascot__torso { animation: mascot-breathe 2.6s ease-in-out infinite; }
        .mascot--idle .mascot__leg--left { animation: mascot-leg-left 2.6s ease-in-out infinite; }
        .mascot--idle .mascot__leg--right { animation: mascot-leg-right 2.6s ease-in-out infinite; }
        .mascot--idle .mascot__arm--left { animation: mascot-arm-left-idle 2.6s ease-in-out infinite; }
        .mascot--idle .mascot__arm--right { animation: mascot-arm-right-idle 2.6s ease-in-out infinite; }

        @keyframes mascot-breathe { 0%, 100% { translate: 0 0; } 50% { translate: 0 -2.5px; } }
        @keyframes mascot-leg-left { 0%, 100% { rotate: 4deg; } 50% { rotate: -4deg; } }
        @keyframes mascot-leg-right { 0%, 100% { rotate: -4deg; } 50% { rotate: 4deg; } }
        @keyframes mascot-arm-left-idle { 0%, 100% { rotate: -3deg; } 50% { rotate: 3deg; } }
        @keyframes mascot-arm-right-idle { 0%, 100% { rotate: 3deg; } 50% { rotate: -3deg; } }

        /* ================= HAPPY ================= */
        .mascot--happy .mascot__torso { animation: mascot-jump 0.6s cubic-bezier(.34,1.56,.64,1) infinite; }
        .mascot--happy .mascot__arm--left { animation: mascot-arm-up-left 0.6s cubic-bezier(.34,1.56,.64,1) infinite; }
        .mascot--happy .mascot__arm--right { animation: mascot-arm-up-right 0.6s cubic-bezier(.34,1.56,.64,1) infinite; }
        .mascot--happy .mascot__leg--left { animation: mascot-leg-left 0.6s ease-in-out infinite; }
        .mascot--happy .mascot__leg--right { animation: mascot-leg-right 0.6s ease-in-out infinite; }
        .mascot--happy .mascot__eyes { animation: mascot-sparkle 0.6s ease-in-out infinite; }

        @keyframes mascot-jump { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
        @keyframes mascot-arm-up-left { 0%, 100% { rotate: -70deg; } 50% { rotate: -95deg; } }
        @keyframes mascot-arm-up-right { 0%, 100% { rotate: 70deg; } 50% { rotate: 95deg; } }
        @keyframes mascot-sparkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

        /* ================= SAD ================= */
        .mascot--sad .mascot__head { animation: mascot-droop-head 2.4s ease-in-out infinite; }
        .mascot--sad .mascot__torso { animation: mascot-droop-torso 2.4s ease-in-out infinite; }
        .mascot--sad .mascot__arm--left { rotate: 12deg; }
        .mascot--sad .mascot__arm--right { rotate: -12deg; }

        @keyframes mascot-droop-head { 0%, 100% { translate: 0 3px; rotate: -3deg; } 50% { translate: 0 4px; rotate: 3deg; } }
        @keyframes mascot-droop-torso { 0%, 100% { translate: 0 1px; } 50% { translate: 0 2px; } }

        /* ================= WAVE ================= */
        .mascot--wave .mascot__arm--right { animation: mascot-wave 0.45s cubic-bezier(.34,1.56,.64,1) infinite; }
        .mascot--wave .mascot__arm--left { animation: mascot-arm-left-idle 1.2s ease-in-out infinite; }
        .mascot--wave .mascot__torso { animation: mascot-breathe 1.2s ease-in-out infinite; }

        @keyframes mascot-wave { 0%, 100% { rotate: 60deg; } 50% { rotate: 95deg; } }

        /* ================= RUN ================= */
        .mascot--run .mascot__torso { animation: mascot-run-bob 0.26s ease-in-out infinite; }
        .mascot--run .mascot__leg--left { animation: mascot-run-leg-left 0.26s ease-in-out infinite; }
        .mascot--run .mascot__leg--right { animation: mascot-run-leg-right 0.26s ease-in-out infinite; }
        .mascot--run .mascot__arm--left { animation: mascot-run-arm-left 0.26s ease-in-out infinite; }
        .mascot--run .mascot__arm--right { animation: mascot-run-arm-right 0.26s ease-in-out infinite; }
        .mascot--run .mascot__eyes { animation: mascot-sparkle 0.3s ease-in-out infinite; }

        @keyframes mascot-run-bob { 0%, 100% { translate: 0 0; rotate: -3deg; } 50% { translate: 0 -4px; rotate: 3deg; } }
        @keyframes mascot-run-leg-left { 0%, 100% { rotate: 24deg; } 50% { rotate: -24deg; } }
        @keyframes mascot-run-leg-right { 0%, 100% { rotate: -24deg; } 50% { rotate: 24deg; } }
        @keyframes mascot-run-arm-left { 0%, 100% { rotate: -30deg; } 50% { rotate: 30deg; } }
        @keyframes mascot-run-arm-right { 0%, 100% { rotate: 30deg; } 50% { rotate: -30deg; } }

        /* ================= THINKING ================= */
        .mascot--thinking .mascot__head { animation: mascot-think-tilt 3s ease-in-out infinite; }
        .mascot--thinking .mascot__eyes { animation: mascot-think-eyes 3s ease-in-out infinite; }
        .mascot--thinking .mascot__arm--right { rotate: -25deg; }

        @keyframes mascot-think-tilt { 0%, 100% { rotate: 0deg; } 50% { rotate: 6deg; } }
        @keyframes mascot-think-eyes {
          0%, 100% { translate: var(--gaze-eye-x, 0px) var(--gaze-eye-y, 0px); }
          25% { translate: calc(var(--gaze-eye-x, 0px) - 3px) var(--gaze-eye-y, 0px); }
          75% { translate: calc(var(--gaze-eye-x, 0px) + 3px) var(--gaze-eye-y, 0px); }
        }

        /* ================= SLEEP ================= */
        .mascot--sleep .mascot__torso { animation: mascot-sleep-breathe 3.4s ease-in-out infinite; }
        .mascot--sleep .mascot__antenna,
        .mascot--sleep .mascot__antenna-tip { animation: mascot-antenna-pulse 2.4s ease-in-out infinite; }
        .mascot--sleep .mascot__zzz { animation: mascot-zzz 2.4s ease-in-out infinite; }
        .mascot--sleep .mascot__arm--left,
        .mascot--sleep .mascot__arm--right { rotate: 6deg; }

        @keyframes mascot-sleep-breathe { 0%, 100% { translate: 0 0; } 50% { translate: 0 -1.5px; } }
        @keyframes mascot-antenna-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes mascot-zzz {
          0% { opacity: 0; translate: 0 0; }
          30% { opacity: 0.9; }
          100% { opacity: 0; translate: 6px -10px; }
        }

        /* ================= LOADING ================= */
        .mascot--loading .mascot__chest-light,
        .mascot--loading .mascot__eyes { animation: mascot-sparkle 0.9s ease-in-out infinite; }
        .mascot--loading .mascot__chest-ring { animation: mascot-ring-spin 1.1s linear infinite; }
        .mascot--loading .mascot__torso { animation: mascot-breathe 1.8s ease-in-out infinite; }

        @keyframes mascot-ring-spin { to { rotate: 360deg; } }

        /* ================= SUCCESS ================= */
        .mascot--success .mascot__torso { animation: mascot-success-pop 0.5s cubic-bezier(.34,1.56,.64,1) 1; }
        .mascot--success .mascot__arm--left { animation: mascot-arm-up-left 0.5s cubic-bezier(.34,1.56,.64,1) 1; }
        .mascot--success .mascot__arm--right { animation: mascot-arm-up-right 0.5s cubic-bezier(.34,1.56,.64,1) 1; }
        .mascot--success .mascot__chest-light { animation: mascot-success-flash 0.8s ease-out 1; }

        @keyframes mascot-success-pop { 0% { translate: 0 0; } 40% { translate: 0 -9px; } 100% { translate: 0 0; } }
        @keyframes mascot-success-flash { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 1; } }

        /* ================= ERROR ================= */
        .mascot--error .mascot__head { animation: mascot-shake 0.4s ease-in-out 2; }
        .mascot--error .mascot__eyes,
        .mascot--error .mascot__chest-light { animation: mascot-sparkle 0.4s ease-in-out 2; }

        @keyframes mascot-shake {
          0%, 100% { rotate: 0deg; }
          25% { rotate: -8deg; }
          75% { rotate: 8deg; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mascot *, .mascot { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}

export default MascotSVG;