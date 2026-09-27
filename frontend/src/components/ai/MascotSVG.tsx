import React from 'react';

/* ============================================================
   MASCOT SVG — oq-to'q sariq skafandrli mitti robot
   Har bir a'zo (bosh, tana, qo'l, oyoq) alohida <g> guruh —
   CSS animatsiyasi orqali holatga (mood) qarab harakatlanadi.
   ============================================================ */

export type MascotMood = 'idle' | 'happy' | 'sad' | 'wave';

interface MascotSVGProps {
  mood: MascotMood;
  size?: number;
}

export function MascotSVG({ mood, size = 64 }: MascotSVGProps) {
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={`mascot-root mascot-mood-${mood}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mascotEyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7FE7FF" />
          <stop offset="60%" stopColor="#22C3E6" />
          <stop offset="100%" stopColor="#0E93B3" />
        </radialGradient>
        <linearGradient id="mascotBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4EFE8" />
          <stop offset="100%" stopColor="#DDD5C8" />
        </linearGradient>
      </defs>

      {/* ---------- Soya ---------- */}
      <ellipse
        className="mascot-shadow"
        cx="60"
        cy="132"
        rx="26"
        ry="5"
        fill="#000"
        opacity="0.18"
      />

      {/* ---------- CHAP OYOQ ---------- */}
      <g className="mascot-leg-left" style={{ transformOrigin: '48px 92px' }}>
        <rect x="40" y="92" width="16" height="28" rx="7" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
        <path d="M36 116 h24 a6 6 0 0 1 6 6 v2 a4 4 0 0 1-4 4 H34 a4 4 0 0 1-4-4 v-2 a6 6 0 0 1 6-6z" fill="#E08A3C" />
        <rect x="34" y="116" width="28" height="5" rx="2.5" fill="#22C3E6" opacity="0.8" />
      </g>

      {/* ---------- O'NG OYOQ ---------- */}
      <g className="mascot-leg-right" style={{ transformOrigin: '72px 92px' }}>
        <rect x="64" y="92" width="16" height="28" rx="7" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
        <path d="M60 116 h24 a6 6 0 0 1 6 6 v2 a4 4 0 0 1-4 4 H58 a4 4 0 0 1-4-4 v-2 a6 6 0 0 1 6-6z" fill="#E08A3C" />
        <rect x="58" y="116" width="28" height="5" rx="2.5" fill="#22C3E6" opacity="0.8" />
      </g>

      {/* ---------- TANA ---------- */}
      <g className="mascot-torso" style={{ transformOrigin: '60px 78px' }}>
        <rect x="34" y="62" width="52" height="38" rx="16" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
        {/* Ko'krak chizig'i */}
        <rect x="46" y="70" width="28" height="6" rx="3" fill="#E08A3C" opacity="0.9" />
        {/* Ko'krak chirog'i */}
        <circle className="mascot-chest-light" cx="60" cy="86" r="6" fill="url(#mascotEyeGlow)" />
        <circle cx="60" cy="86" r="9" fill="none" stroke="#22C3E6" strokeWidth="1.5" opacity="0.5" />

        {/* ---------- CHAP QO'L ---------- */}
        <g className="mascot-arm-left" style={{ transformOrigin: '36px 70px' }}>
          <rect x="24" y="68" width="13" height="26" rx="6.5" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
          <circle cx="30.5" cy="96" r="7" fill="#E08A3C" />
          <circle cx="30.5" cy="96" r="2.4" fill="#22C3E6" />
        </g>

        {/* ---------- O'NG QO'L ---------- */}
        <g className="mascot-arm-right" style={{ transformOrigin: '84px 70px' }}>
          <rect x="83" y="68" width="13" height="26" rx="6.5" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
          <circle cx="89.5" cy="96" r="7" fill="#E08A3C" />
          <circle cx="89.5" cy="96" r="2.4" fill="#22C3E6" />
        </g>
      </g>

      {/* ---------- BOSH (skafandr) ---------- */}
      <g className="mascot-head" style={{ transformOrigin: '60px 46px' }}>
        {/* Quloq-kapsulalar */}
        <circle cx="27" cy="46" r="9" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
        <circle cx="93" cy="46" r="9" fill="url(#mascotBody)" stroke="#C9BEA8" strokeWidth="1.5" />
        <circle cx="27" cy="46" r="3.2" fill="#22C3E6" opacity="0.85" />
        <circle cx="93" cy="46" r="3.2" fill="#22C3E6" opacity="0.85" />

        {/* Shlem */}
        <path
          d="M60 8 C82 8 96 24 96 44 C96 60 88 66 60 66 C32 66 24 60 24 44 C24 24 38 8 60 8 Z"
          fill="url(#mascotBody)"
          stroke="#C9BEA8"
          strokeWidth="1.5"
        />
        {/* Antenna chiziq */}
        <rect x="48" y="12" width="24" height="5" rx="2.5" fill="#E08A3C" />

        {/* Vizor (qora oyna) */}
        <rect x="34" y="34" width="52" height="26" rx="13" fill="#1B1F26" />
        <rect x="34" y="34" width="52" height="26" rx="13" fill="none" stroke="#E08A3C" strokeWidth="2" />

        {/* Ko'zlar */}
        <g className="mascot-eyes">
          <circle cx="49" cy="47" r="7" fill="url(#mascotEyeGlow)" />
          <circle cx="71" cy="47" r="7" fill="url(#mascotEyeGlow)" />
          <circle cx="47" cy="45" r="2" fill="#fff" opacity="0.9" />
          <circle cx="69" cy="45" r="2" fill="#fff" opacity="0.9" />
        </g>
      </g>

      <style>{`
        .mascot-root { overflow: visible; }

        /* ---------- IDLE — sekin nafas olish + yurish taassuroti ---------- */
        .mascot-mood-idle .mascot-torso,
        .mascot-mood-idle .mascot-head {
          animation: mascotBreathe 2.6s ease-in-out infinite;
        }
        .mascot-mood-idle .mascot-leg-left {
          animation: mascotLegLeft 2.6s ease-in-out infinite;
        }
        .mascot-mood-idle .mascot-leg-right {
          animation: mascotLegRight 2.6s ease-in-out infinite;
        }
        .mascot-mood-idle .mascot-arm-left {
          animation: mascotArmLeftIdle 2.6s ease-in-out infinite;
        }
        .mascot-mood-idle .mascot-arm-right {
          animation: mascotArmRightIdle 2.6s ease-in-out infinite;
        }

        @keyframes mascotBreathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
        @keyframes mascotLegLeft {
          0%, 100% { transform: rotate(4deg); }
          50% { transform: rotate(-4deg); }
        }
        @keyframes mascotLegRight {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes mascotArmLeftIdle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes mascotArmRightIdle {
          0%, 100% { transform: rotate(3deg); }
          50% { transform: rotate(-3deg); }
        }

        /* ---------- HAPPY — sakrab, qo'llarini ko'tarib quvonadi ---------- */
        .mascot-mood-happy .mascot-torso,
        .mascot-mood-happy .mascot-head {
          animation: mascotJump 0.6s ease-in-out infinite;
        }
        .mascot-mood-happy .mascot-arm-left {
          animation: mascotArmUpLeft 0.6s ease-in-out infinite;
        }
        .mascot-mood-happy .mascot-arm-right {
          animation: mascotArmUpRight 0.6s ease-in-out infinite;
        }
        .mascot-mood-happy .mascot-leg-left {
          animation: mascotLegLeft 0.6s ease-in-out infinite;
        }
        .mascot-mood-happy .mascot-leg-right {
          animation: mascotLegRight 0.6s ease-in-out infinite;
        }
        .mascot-mood-happy .mascot-eyes {
          animation: mascotSparkle 0.6s ease-in-out infinite;
        }

        @keyframes mascotJump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes mascotArmUpLeft {
          0%, 100% { transform: rotate(-70deg); }
          50% { transform: rotate(-95deg); }
        }
        @keyframes mascotArmUpRight {
          0%, 100% { transform: rotate(70deg); }
          50% { transform: rotate(95deg); }
        }
        @keyframes mascotSparkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* ---------- SAD — boshini osiltirib, sekin qimirlaydi ---------- */
        .mascot-mood-sad .mascot-head {
          animation: mascotDroopHead 2.4s ease-in-out infinite;
        }
        .mascot-mood-sad .mascot-torso {
          animation: mascotDroopTorso 2.4s ease-in-out infinite;
        }
        .mascot-mood-sad .mascot-arm-left {
          transform: rotate(12deg);
        }
        .mascot-mood-sad .mascot-arm-right {
          transform: rotate(-12deg);
        }

        @keyframes mascotDroopHead {
          0%, 100% { transform: translateY(3px) rotate(-3deg); }
          50% { transform: translateY(4px) rotate(3deg); }
        }
        @keyframes mascotDroopTorso {
          0%, 100% { transform: translateY(1px); }
          50% { transform: translateY(2px); }
        }

        /* ---------- WAVE — o'ng qo'lini silkitib salomlashadi ---------- */
        .mascot-mood-wave .mascot-arm-right {
          animation: mascotWave 0.45s ease-in-out infinite;
        }
        .mascot-mood-wave .mascot-arm-left {
          animation: mascotArmLeftIdle 1.2s ease-in-out infinite;
        }
        .mascot-mood-wave .mascot-torso,
        .mascot-mood-wave .mascot-head {
          animation: mascotBreathe 1.2s ease-in-out infinite;
        }

        @keyframes mascotWave {
          0%, 100% { transform: rotate(60deg); }
          50% { transform: rotate(95deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mascot-root * { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}

export default MascotSVG;