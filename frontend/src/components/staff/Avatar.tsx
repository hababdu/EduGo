const PALETTE = [
  'bg-gold/15 text-gold',
  'bg-teal/15 text-teal',
  'bg-sky/15 text-sky',
  'bg-coral/15 text-coral',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string | null;
}

const SIZE = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };

/** Ism bosh harflari bilan doira (rasm bo'lsa — rasm). Rangi ismga qarab barqaror. */
export function Avatar({ name, size = 'md', src }: Props) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?';
  if (src) {
    return <img src={src} alt="" className={`${SIZE[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${SIZE[size]} ${PALETTE[hash(name) % PALETTE.length]} flex shrink-0 items-center justify-center rounded-full font-bold`} aria-hidden="true">
      {initials}
    </span>
  );
}
