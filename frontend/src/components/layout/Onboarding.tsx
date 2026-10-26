import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { playSound } from '../../lib/sound';

interface Step { icon: string; title: string; text: string }

const STEPS: Record<string, Step[]> = {
  STUDENT: [
    { icon: '👋', title: 'EduGo\'ga xush kelibsiz!', text: 'Bu yerda dars ko\'rasiz, test ishlaysiz va uy vazifasini topshirasiz. Hammasi Telegram ichida.' },
    { icon: '📚', title: 'Darslar', text: 'Guruhingizdagi materiallar Darslar bo\'limida. O\'qituvchi yangi material qo\'shsa, xabar olasiz.' },
    { icon: '📝', title: 'Testlar', text: 'Test vaqt bilan ishlanadi. Boshlagach taymer to\'xtamaydi, shuning uchun tayyor bo\'lganda boshlang.' },
    { icon: '⏰', title: 'Uy vazifasi', text: 'Muddatgacha topshiring (sana va soat ko\'rsatilgan). Muddat tugagach AI hammaning ishini tekshirib, ball qo\'yadi.' },
    { icon: '🏆', title: 'Reyting va AI ustoz', text: 'Ballaringiz reytingda ko\'rinadi. Tushunmagan mavzuni AI ustozdan so\'rang.' },
  ],
  TEACHER: [
    { icon: '👋', title: 'EduGo\'ga xush kelibsiz!', text: 'Siz guruh, material, vazifa va test yarata olasiz. Qisqa tanishib chiqamiz.' },
    { icon: '👥', title: 'Guruhlar', text: 'Avval guruh yarating va o\'quvchilarni qo\'shing. Hamma narsa guruhga beriladi.' },
    { icon: '📎', title: 'Material va uy vazifasi', text: 'Guruhda material qo\'shing. Uy vazifasiga muddat (sana va soat) qo\'ying: shundan o\'quvchilar topshira boshlaydi.' },
    { icon: '🤖', title: 'AI baholash', text: 'Muddat tugagach AI barcha ishlarni baholaydi. Xohlasangiz "Hozir baholash" tugmasini bosing yoki ballni o\'zingiz tuzating.' },
    { icon: '✅', title: 'Test, natija, davomat', text: 'Testni qo\'lda yoki AI savollari bilan yarating (AI savollarini tekshirib chiqing). Natija va davomatni guruh sahifasida ko\'rasiz.' },
  ],
  ADMIN: [
    { icon: '👋', title: 'EduGo\'ga xush kelibsiz!', text: 'Siz o\'z maktabingizni boshqarasiz. Faqat o\'z maktabingiz ma\'lumotlari ko\'rinadi.' },
    { icon: '🧑‍🏫', title: 'Foydalanuvchilar', text: 'O\'qituvchi va o\'quvchilarga rol bering, kerak bo\'lsa bloklang.' },
    { icon: '👥', title: 'Guruhlar', text: 'Guruhlar, o\'qituvchi biriktirish va o\'quvchilarni shu yerda yuritasiz.' },
    { icon: '💳', title: 'To\'lov va davomat', text: 'To\'lovlar va davomat nazorati sizda. AI yordamchi statistikani ko\'rsatadi, siz tasdiqlaysiz.' },
  ],
  SUPER_ADMIN: [
    { icon: '👋', title: 'Super admin paneli', text: 'Bu yerda barcha maktablarni boshqarasiz.' },
    { icon: '🏫', title: 'Maktablar va adminlar', text: 'Maktab yarating, ro\'yxatdan foydalanuvchini tanlab admin qiling.' },
    { icon: '🤖', title: 'AI va audit', text: 'AI limitini boshqaring, audit jurnali va tizim holatini kuzating.' },
  ],
};

const key = (id: string) => `edugo.onboarded.${id}`;
const REPLAY = 'edugo:onboarding';

export function replayOnboarding() {
  window.dispatchEvent(new Event(REPLAY));
}

export function Onboarding() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const steps = STEPS[user?.role ?? 'STUDENT'] ?? STEPS.STUDENT;

  useEffect(() => {
    if (!user) return;
    let seen = false;
    try { seen = localStorage.getItem(key(user.id)) === '1'; } catch { /* ruxsat yo'q */ }
    if (!seen) setOpen(true);
  }, [user?.id]);

  useEffect(() => {
    const on = () => { setI(0); setOpen(true); };
    window.addEventListener(REPLAY, on);
    return () => window.removeEventListener(REPLAY, on);
  }, []);

  if (!open || !user) return null;

  const close = () => {
    try { localStorage.setItem(key(user.id), '1'); } catch { /* ruxsat yo'q */ }
    setOpen(false);
  };
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-tint/10 p-6 text-center shadow-2xl">
        <div className="text-5xl mb-3">{s.icon}</div>
        <h2 className="text-lg font-bold mb-2">{s.title}</h2>
        <p className="text-sm text-ink-muted leading-relaxed min-h-[84px]">{s.text}</p>
        <div className="flex justify-center gap-1.5 my-4">
          {steps.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-gold' : 'w-1.5 bg-tint/20'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {!last && (
            <button onClick={close} className="px-4 py-3 rounded-xl text-xs text-ink-muted">O'tkazib yuborish</button>
          )}
          <button
            onClick={() => { if (last) { playSound('nav'); close(); } else setI(i + 1); }}
            className="flex-1 py-3 rounded-xl bg-accent text-base font-semibold text-sm active:scale-[0.98] transition"
          >
            {last ? 'Boshlash' : 'Keyingisi'}
          </button>
        </div>
      </div>
    </div>
  );
}
