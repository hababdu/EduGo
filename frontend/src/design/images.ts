// ============================================================
// RASMLAR — yagona manba (webp, siqilgan; Vite hash bilan beradi)
// ============================================================
import hero from '../assets/images/hero.webp';
import mathCoding from '../assets/images/math-coding.webp';
import sciencePhysics from '../assets/images/science-physics.webp';
import ieltsLanguage from '../assets/images/ielts-language.webp';

export const IMAGES = { hero, mathCoding, sciencePhysics, ieltsLanguage } as const;

/** Fan nomidan mos rasmni tanlaydi; topilmasa — null (rasm ko'rsatilmaydi). */
export function subjectImage(title?: string | null): string | null {
  const t = (title ?? '').toLowerCase();
  if (/(mat|algebra|geometr|dastur|kod|informat|programm|it\b|frontend|backend)/.test(t)) return IMAGES.mathCoding;
  if (/(fizik|kimyo|biolog|science|fan\b|tabiat)/.test(t)) return IMAGES.sciencePhysics;
  if (/(ingliz|english|ielts|til\b|rus|nemis|language|adabiyot)/.test(t)) return IMAGES.ieltsLanguage;
  return null;
}
