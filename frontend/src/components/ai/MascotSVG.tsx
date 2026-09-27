import React, { useId } from 'react';

export type MascotMood =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'wave'
  | 'run';

interface MascotSVGProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
}

const COLORS = {
  bodyLight: '#F4EFE8',
  bodyDark: '#DDD5C8',
  bodyStroke: '#C9BEA8',
  orange: '#E08A3C',
  cyan: '#22C3E6',
  cyanLight: '#7FE7FF',
  cyanDark: '#0E93B3',
  visor: '#1B1F26',
  shadow: '#000',
} as const;

export function MascotSVG({
  mood = 'idle',
  size = 64,
  className = '',
}: MascotSVGProps) {
  const gradientId = useId();

  const eyeGradientId = `mascot-eye-${gradientId}`;
  const bodyGradientId = `mascot-body-${gradientId}`;

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={`mascot mascot--${mood} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient
          id={eyeGradientId}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop offset="0%" stopColor={COLORS.cyanLight} />
          <stop offset="60%" stopColor={COLORS.cyan} />
          <stop offset="100%" stopColor={COLORS.cyanDark} />
        </radialGradient>

        <linearGradient
          id={bodyGradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={COLORS.bodyLight} />
          <stop offset="100%" stopColor={COLORS.bodyDark} />
        </linearGradient>
      </defs>

      {/* Shadow */}
      <ellipse
        className="mascot__shadow"
        cx="60"
        cy="132"
        rx="26"
        ry="5"
        fill={COLORS.shadow}
        opacity="0.18"
      />

      {/* Left leg */}
      <g className="mascot__leg mascot__leg--left">
        <rect
          x="40"
          y="92"
          width="16"
          height="28"
          rx="7"
          fill={`url(#${bodyGradientId})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />

        <path
          d="M36 116h24a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6z"
          fill={COLORS.orange}
        />

        <rect
          x="34"
          y="116"
          width="28"
          height="5"
          rx="2.5"
          fill={COLORS.cyan}
          opacity="0.8"
        />
      </g>

      {/* Right leg */}
      <g className="mascot__leg mascot__leg--right">
        <rect
          x="64"
          y="92"
          width="16"
          height="28"
          rx="7"
          fill={`url(#${bodyGradientId})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />

        <path
          d="M60 116h24a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4H58a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6z"
          fill={COLORS.orange}
        />

        <rect
          x="58"
          y="116"
          width="28"
          height="5"
          rx="2.5"
          fill={COLORS.cyan}
          opacity="0.8"
        />
      </g>

      {/* Body */}
      <g className="mascot__torso">
        <rect
          x="34"
          y="62"
          width="52"
          height="38"
          rx="16"
          fill={`url(#${bodyGradientId})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />

        {/* Chest line */}
        <rect
          x="46"
          y="70"
          width="28"
          height="6"
          rx="3"
          fill={COLORS.orange}
          opacity="0.9"
        />

        {/* Chest light */}
        <circle
          className="mascot__chest-light"
          cx="60"
          cy="86"
          r="6"
          fill={`url(#${eyeGradientId})`}
        />

        <circle
          cx="60"
          cy="86"
          r="9"
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Left arm */}
        <g className="mascot__arm mascot__arm--left">
          <rect
            x="24"
            y="68"
            width="13"
            height="26"
            rx="6.5"
            fill={`url(#${bodyGradientId})`}
            stroke={COLORS.bodyStroke}
            strokeWidth="1.5"
          />

          <circle
            cx="30.5"
            cy="96"
            r="7"
            fill={COLORS.orange}
          />

          <circle
            cx="30.5"
            cy="96"
            r="2.4"
            fill={COLORS.cyan}
          />
        </g>

        {/* Right arm */}
        <g className="mascot__arm mascot__arm--right">
          <rect
            x="83"
            y="68"
            width="13"
            height="26"
            rx="6.5"
            fill={`url(#${bodyGradientId})`}
            stroke={COLORS.bodyStroke}
            strokeWidth="1.5"
          />

          <circle
            cx="89.5"
            cy="96"
            r="7"
            fill={COLORS.orange}
          />

          <circle
            cx="89.5"
            cy="96"
            r="2.4"
            fill={COLORS.cyan}
          />
        </g>
      </g>

      {/* Head */}
      <g className="mascot__head">
        {/* Ear capsules */}
        <circle
          cx="27"
          cy="46"
          r="9"
          fill={`url(#${bodyGradientId})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />

        <circle
          cx="93"
          cy="46"
          r="9"
          fill={`url(#${bodyGradientId})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />

        <circle
          cx="27"
          cy="46"
          r="3.2"
          fill={COLORS.cyan}
          opacity="0.85"
        />

        <circle
          cx="93"
          cy="46"
          r="3.2"
          fill={COLORS.cyan}
          opacity="0.85"
        />

        {/* Helmet */}
        <path
          d="
            M60 8
            C82 8 96 24 96 44
            C96 60 88 66 60 66
            C32 66 24 60 24 44
            C24 24 38 8 60 8
            Z
          "
          fill={`url(#${bodyGradientId})`}
          stroke={COLORS.bodyStroke}
          strokeWidth="1.5"
        />

        {/* Antenna */}
        <rect
          x="48"
          y="12"
          width="24"
          height="5"
          rx="2.5"
          fill={COLORS.orange}
        />

        {/* Visor */}
        <rect
          x="34"
          y="34"
          width="52"
          height="26"
          rx="13"
          fill={COLORS.visor}
        />

        <rect
          x="34"
          y="34"
          width="52"
          height="26"
          rx="13"
          fill="none"
          stroke={COLORS.orange}
          strokeWidth="2"
        />

        {/* Eyes */}
        <g className="mascot__eyes">
          <circle
            cx="49"
            cy="47"
            r="7"
            fill={`url(#${eyeGradientId})`}
          />

          <circle
            cx="71"
            cy="47"
            r="7"
            fill={`url(#${eyeGradientId})`}
          />

          <circle
            cx="47"
            cy="45"
            r="2"
            fill="#fff"
            opacity="0.9"
          />

          <circle
            cx="69"
            cy="45"
            r="2"
            fill="#fff"
            opacity="0.9"
          />
        </g>
      </g>

      <style>{`
        .mascot {
          overflow: visible;
          display: block;
        }

        .mascot__head,
        .mascot__torso {
          transform-box: fill-box;
        }

        .mascot__head {
          transform-origin: center;
        }

        .mascot__torso {
          transform-origin: center;
        }

        .mascot__leg--left {
          transform-origin: 48px 92px;
        }

        .mascot__leg--right {
          transform-origin: 72px 92px;
        }

        .mascot__arm--left {
          transform-origin: 36px 70px;
        }

        .mascot__arm--right {
          transform-origin: 84px 70px;
        }

        /* =========================
           IDLE
        ========================= */

        .mascot--idle .mascot__head,
        .mascot--idle .mascot__torso {
          animation: mascot-breathe 2.6s ease-in-out infinite;
        }

        .mascot--idle .mascot__leg--left {
          animation: mascot-leg-left 2.6s ease-in-out infinite;
        }

        .mascot--idle .mascot__leg--right {
          animation: mascot-leg-right 2.6s ease-in-out infinite;
        }

        .mascot--idle .mascot__arm--left {
          animation: mascot-arm-left-idle 2.6s ease-in-out infinite;
        }

        .mascot--idle .mascot__arm--right {
          animation: mascot-arm-right-idle 2.6s ease-in-out infinite;
        }

        @keyframes mascot-breathe {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-2.5px);
          }
        }

        @keyframes mascot-leg-left {
          0%, 100% {
            transform: rotate(4deg);
          }

          50% {
            transform: rotate(-4deg);
          }
        }

        @keyframes mascot-leg-right {
          0%, 100% {
            transform: rotate(-4deg);
          }

          50% {
            transform: rotate(4deg);
          }
        }

        @keyframes mascot-arm-left-idle {
          0%, 100% {
            transform: rotate(-3deg);
          }

          50% {
            transform: rotate(3deg);
          }
        }

        @keyframes mascot-arm-right-idle {
          0%, 100% {
            transform: rotate(3deg);
          }

          50% {
            transform: rotate(-3deg);
          }
        }

        /* =========================
           HAPPY
        ========================= */

        .mascot--happy .mascot__head,
        .mascot--happy .mascot__torso {
          animation: mascot-jump 0.6s ease-in-out infinite;
        }

        .mascot--happy .mascot__arm--left {
          animation: mascot-arm-up-left 0.6s ease-in-out infinite;
        }

        .mascot--happy .mascot__arm--right {
          animation: mascot-arm-up-right 0.6s ease-in-out infinite;
        }

        .mascot--happy .mascot__leg--left {
          animation: mascot-leg-left 0.6s ease-in-out infinite;
        }

        .mascot--happy .mascot__leg--right {
          animation: mascot-leg-right 0.6s ease-in-out infinite;
        }

        .mascot--happy .mascot__eyes {
          animation: mascot-sparkle 0.6s ease-in-out infinite;
        }

        @keyframes mascot-jump {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes mascot-arm-up-left {
          0%, 100% {
            transform: rotate(-70deg);
          }

          50% {
            transform: rotate(-95deg);
          }
        }

        @keyframes mascot-arm-up-right {
          0%, 100% {
            transform: rotate(70deg);
          }

          50% {
            transform: rotate(95deg);
          }
        }

        @keyframes mascot-sparkle {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.7;
          }
        }

        /* =========================
           SAD
        ========================= */

        .mascot--sad .mascot__head {
          animation: mascot-droop-head 2.4s ease-in-out infinite;
        }

        .mascot--sad .mascot__torso {
          animation: mascot-droop-torso 2.4s ease-in-out infinite;
        }

        .mascot--sad .mascot__arm--left {
          transform: rotate(12deg);
        }

        .mascot--sad .mascot__arm--right {
          transform: rotate(-12deg);
        }

        @keyframes mascot-droop-head {
          0%, 100% {
            transform: translateY(3px) rotate(-3deg);
          }

          50% {
            transform: translateY(4px) rotate(3deg);
          }
        }

        @keyframes mascot-droop-torso {
          0%, 100% {
            transform: translateY(1px);
          }

          50% {
            transform: translateY(2px);
          }
        }

        /* =========================
           WAVE
        ========================= */

        .mascot--wave .mascot__arm--right {
          animation: mascot-wave 0.45s ease-in-out infinite;
        }

        .mascot--wave .mascot__arm--left {
          animation: mascot-arm-left-idle 1.2s ease-in-out infinite;
        }

        .mascot--wave .mascot__head,
        .mascot--wave .mascot__torso {
          animation: mascot-breathe 1.2s ease-in-out infinite;
        }

        @keyframes mascot-wave {
          0%, 100% {
            transform: rotate(60deg);
          }

          50% {
            transform: rotate(95deg);
          }
        }

        /* =========================
           RUN
        ========================= */

        .mascot--run .mascot__head,
        .mascot--run .mascot__torso {
          animation: mascot-run-bob 0.26s ease-in-out infinite;
        }

        .mascot--run .mascot__leg--left {
          animation: mascot-run-leg-left 0.26s ease-in-out infinite;
        }

        .mascot--run .mascot__leg--right {
          animation: mascot-run-leg-right 0.26s ease-in-out infinite;
        }

        .mascot--run .mascot__arm--left {
          animation: mascot-run-arm-left 0.26s ease-in-out infinite;
        }

        .mascot--run .mascot__arm--right {
          animation: mascot-run-arm-right 0.26s ease-in-out infinite;
        }

        .mascot--run .mascot__eyes {
          animation: mascot-sparkle 0.3s ease-in-out infinite;
        }

        @keyframes mascot-run-bob {
          0%, 100% {
            transform: translateY(0) rotate(-3deg);
          }

          50% {
            transform: translateY(-4px) rotate(3deg);
          }
        }

        @keyframes mascot-run-leg-left {
          0%, 100% {
            transform: rotate(24deg);
          }

          50% {
            transform: rotate(-24deg);
          }
        }

        @keyframes mascot-run-leg-right {
          0%, 100% {
            transform: rotate(-24deg);
          }

          50% {
            transform: rotate(24deg);
          }
        }

        @keyframes mascot-run-arm-left {
          0%, 100% {
            transform: rotate(-30deg);
          }

          50% {
            transform: rotate(30deg);
          }
        }

        @keyframes mascot-run-arm-right {
          0%, 100% {
            transform: rotate(30deg);
          }

          50% {
            transform: rotate(-30deg);
          }
        }

        /* =========================
           ACCESSIBILITY
        ========================= */

        @media (prefers-reduced-motion: reduce) {
          .mascot *,
          .mascot {
            animation: none !important;
          }
        }
      `}</style>
    </svg>
  );
}

export default MascotSVG;