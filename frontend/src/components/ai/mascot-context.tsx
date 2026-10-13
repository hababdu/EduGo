import { createContext, useContext, type ReactNode } from 'react';
import { type MascotMood } from './MascotSVG';
import { IslandBot } from './island/IslandBot';
import { type IslandMood } from './island/moods';
import { useOutfitPref } from './island/outfits';

/* Robot konteksti: hissiyat, kiyim va suhbatlar robotga "reaksiya" yuborishi uchun.
   Alohida faylda — chat komponentlari AIMascot'ni import qilib aylanma bog'lanish hosil qilmasligi uchun. */

export interface AttachedFile {
  name: string;
  /** Matn ko'rinishidagi mazmuni (kesilgan bo'lishi mumkin) */
  text: string;
  truncated?: boolean;
}

export interface OpenChatContext {
  studentName?: string;
  weakTopics?: string[];
  file?: AttachedFile;
}

/** Suhbatdan robotga keladigan voqealar */
export type MascotReaction = 'thinking' | 'working' | 'finished' | 'error' | 'approval' | 'idle';

export interface MascotContextValue {
  celebrate: () => void;
  comfort: () => void;
  speak: (text: string, mood?: MascotMood) => void;
  openChat: (ctx?: OpenChatContext) => void;
  mood: IslandMood;
  react: (e: MascotReaction) => void;
  /** Robotga bosish: bir marta — jahli chiqadi, ketma-ket 3 marta — boshi aylanadi */
  poke: () => void;
  /** Robotni ushlab turish: 1.5 soniyadan keyin yurakchalar */
  petStart: () => void;
  petEnd: () => void;
  /** Ochilgan chatga ilova qilingan fayl (bir martalik) */
  takeFile: () => AttachedFile | undefined;
  chatContext: OpenChatContext;
}

const noop = () => {};

export const MascotContext = createContext<MascotContextValue | null>(null);

export function useMascot(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    return {
      celebrate: noop,
      comfort: noop,
      speak: noop,
      openChat: noop,
      mood: 'idle',
      react: noop,
      poke: noop,
      petStart: noop,
      petEnd: noop,
      takeFile: () => undefined,
      chatContext: {},
    };
  }
  return ctx;
}

/** Chat oynasi sarlavhasidagi jonli robot: bosish, ushlab turish — hissiyotlarni uyg'otadi */
export function LiveBot({ size = 52, children }: { size?: number; children?: ReactNode }) {
  const { mood, poke, petStart, petEnd } = useMascot();
  const { outfit } = useOutfitPref();
  return (
    <button
      type="button"
      aria-label="Robot bilan o'ynash"
      data-silent
      onClick={poke}
      onPointerDown={petStart}
      onPointerUp={petEnd}
      onPointerLeave={petEnd}
      onPointerCancel={petEnd}
      className="shrink-0 select-none touch-manipulation"
      style={{ touchAction: 'manipulation' }}
    >
      <IslandBot mood={mood} outfit={outfit} size={size} />
      {children}
    </button>
  );
}
