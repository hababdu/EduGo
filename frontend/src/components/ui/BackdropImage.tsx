import { ReactNode } from 'react';

interface BackdropImageProps {
  src: string;
  /** 0–1: rasm qanchalik ko'rinsin (matn o'qilishi uchun past tuting) */
  opacity?: number;
  /** px: xira qilish. Rasm ichidagi yozuvlar o'qilmasligi uchun 6+ tavsiya */
  blur?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Bo'lim orqasiga rasm qo'yadi: rasm xira, ustidan fon rangiga o'tuvchi gradient.
 * Kontent har doim ustida (z-10) va o'qiladigan bo'lib qoladi.
 */
export function BackdropImage({ src, opacity = 0.22, blur = 8, className = '', children }: BackdropImageProps) {
  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 -z-20 h-full w-full object-cover scale-110"
        style={{ opacity, filter: `blur(${blur}px)` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-base/10 via-base/45 to-base"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
