import { ReactNode } from 'react';
import { StaffHero } from '../../staff';
import { IMAGES, subjectImage } from '../../../design/images';
import { ChevronLeft } from '../../../design/icons';

interface Props {
  eyebrow: string;
  title: string;
  onBack: () => void;
  actions?: ReactNode;
}

/** Kontent (fan/bo'lim/mavzu) sahifalari uchun yagona yangi uslubdagi banner. */
export function ContentHero({ eyebrow, title, onBack, actions }: Props) {
  return (
    <StaffHero
      eyebrow={eyebrow}
      title={title}
      image={subjectImage(title) ?? IMAGES.hero}
      accent="teal"
      actions={actions}
      top={
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-ink-muted hover:text-ink active:scale-95 transition"
          aria-label="Orqaga"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      }
    />
  );
}
