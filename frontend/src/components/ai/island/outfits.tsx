import { useSyncExternalStore } from 'react';

/* Garderob: robot kiyimlari. "Avto" — faslga/bayramga qarab o'zi tanlaydi. */

export type OutfitId = 'cap' | 'doppi' | 'santa' | 'party' | 'crown' | 'shades' | 'none';
export type OutfitPref = OutfitId | 'auto';

export const OUTFITS: { id: OutfitId; label: string; emoji: string }[] = [
  { id: 'cap', label: 'Bitiruvchi qalpoq', emoji: '🎓' },
  { id: 'doppi', label: "Do'ppi", emoji: '🧢' },
  { id: 'santa', label: 'Yangi yil', emoji: '🎅' },
  { id: 'party', label: 'Bayram', emoji: '🥳' },
  { id: 'crown', label: 'Toj', emoji: '👑' },
  { id: 'shades', label: "Ko'zoynak", emoji: '😎' },
  { id: 'none', label: 'Kiyimsiz', emoji: '🤖' },
];

const KEY = 'edugo.outfit';
const listeners = new Set<() => void>();
let pref: OutfitPref | null = null;

function read(): OutfitPref {
  if (pref === null) {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* ruxsat yo'q */ }
    pref = v && (v === 'auto' || OUTFITS.some((o) => o.id === v)) ? (v as OutfitPref) : 'auto';
  }
  return pref;
}

export function setOutfitPref(v: OutfitPref) {
  pref = v;
  try { localStorage.setItem(KEY, v); } catch { /* ruxsat yo'q */ }
  listeners.forEach((l) => l());
}

/** Avto rejim: Navro'z — do'ppi, Yangi yil — qor bobo qalpog'i, yoz — ko'zoynak, qolgan paytda — qalpoq */
export function autoOutfit(d: Date = new Date()): OutfitId {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 15) || (m === 4 && day <= 5)) return 'doppi';
  if ((m === 12 && day >= 15) || (m === 1 && day <= 10)) return 'santa';
  if (m >= 6 && m <= 8) return 'shades';
  return 'cap';
}

export function useOutfitPref(): { pref: OutfitPref; outfit: OutfitId } {
  const p = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    read,
    () => 'auto' as OutfitPref,
  );
  return { pref: p, outfit: p === 'auto' ? autoOutfit() : p };
}

/** SVG qatlami (robot bilan bir xil viewBox: 0 -16 120 88). `behind` — ko'zoynak kabi yuz ustidagilar */
export function OutfitLayer({ outfit }: { outfit: OutfitId }) {
  switch (outfit) {
    case 'cap':
      return (
        <g>
          <path d="M42 14 V24 L60 31 L78 24 V14 L60 21Z" fill="#111827" stroke="#E8B84A" strokeWidth="1" />
          <path d="M26 10 L60 -3 L94 10 L60 23Z" fill="#1F2937" stroke="#E8B84A" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M94 10 V24" stroke="#E8B84A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="94" cy="26" r="2.6" fill="#E8B84A" />
          <circle cx="60" cy="10" r="2" fill="#E8B84A" />
        </g>
      );
    case 'doppi':
      return (
        <g>
          <path d="M30 14 Q32 -8 60 -8 Q88 -8 90 14 Z" fill="#101426" stroke="#F6F3EA" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M30 14 H90" stroke="#F6F3EA" strokeWidth="2.5" />
          {[44, 60, 76].map((x) => (
            <path key={x} d={`M${x} 2 l5 5 l-5 5 l-5 -5Z`} fill="none" stroke="#F6F3EA" strokeWidth="1.3" />
          ))}
          <circle cx="60" cy="7" r="1.6" fill="#E8B84A" />
        </g>
      );
    case 'santa':
      return (
        <g>
          <path d="M32 14 Q40 -16 80 -8 Q92 -4 90 14Z" fill="#E53E3E" />
          <rect x="28" y="9" width="64" height="9" rx="4.5" fill="#F8FAFC" />
          <circle cx="82" cy="-9" r="6" fill="#F8FAFC" />
        </g>
      );
    case 'party':
      return (
        <g>
          <path d="M46 12 L60 -14 L74 12Z" fill="#E8B84A" stroke="#B8861B" strokeWidth="1" strokeLinejoin="round" />
          <path d="M52 3 L68 3 M49 8 L71 8" stroke="#F4505E" strokeWidth="2" />
          <circle cx="60" cy="-15" r="4" fill="#4FD1B5" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M34 12 L38 -6 L49 4 L60 -10 L71 4 L82 -6 L86 12Z" fill="#E8B84A" stroke="#B8861B" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="60" cy="3" r="2.3" fill="#F4505E" />
          <circle cx="45" cy="6" r="1.7" fill="#4FD1B5" />
          <circle cx="75" cy="6" r="1.7" fill="#4FD1B5" />
        </g>
      );
    case 'shades':
      return (
        <g>
          <rect x="24" y="27" width="30" height="20" rx="7" fill="#0B1020" stroke="#E8B84A" strokeWidth="1.6" />
          <rect x="66" y="27" width="30" height="20" rx="7" fill="#0B1020" stroke="#E8B84A" strokeWidth="1.6" />
          <path d="M54 34 H66" stroke="#E8B84A" strokeWidth="2" />
          <path d="M29 31 l6 -2 M71 31 l6 -2" stroke="#F6F3EA" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}
