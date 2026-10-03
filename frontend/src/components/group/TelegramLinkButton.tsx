import { Send } from 'lucide-react';

/** Backend bilan bir xil qat'iy qoida: faqat https://t.me | telegram.me */
export const TELEGRAM_URL_REGEX = /^https:\/\/(t\.me|telegram\.me)\/[A-Za-z0-9_+/-]{3,100}$/;

export function isTelegramUrl(url: unknown): url is string {
  return typeof url === 'string' && TELEGRAM_URL_REGEX.test(url);
}

interface Props {
  url?: string | null;
  label?: string;
  className?: string;
}

/** Guruhning Telegram chati/boti havolasi. Noto'g'ri havola bo'lsa umuman ko'rsatilmaydi. */
export function TelegramLinkButton({ url, label = 'Telegram guruh', className = '' }: Props) {
  if (!isTelegramUrl(url)) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        // Telegram ichida bo'lsa — ilova ichidan ochamiz
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openTelegramLink) {
          e.preventDefault();
          tg.openTelegramLink(url);
        }
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#229ED9] px-3.5 py-2 text-xs font-semibold text-white active:scale-[0.98] transition ${className}`}
    >
      <Send className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
