import { useTelegram } from '../../../hooks/useTelegram';

interface PublishToggleProps {
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  isPending?: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function PublishToggle({
  status,
  isPending,
  onPublish,
  onUnpublish,
}: PublishToggleProps) {
  const { haptic } = useTelegram();
  const isPublished = status === 'PUBLISHED';

  const handleClick = () => {
    haptic('light');
    if (isPublished) onUnpublish();
    else onPublish();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`shrink-0 text-xs font-semibold px-3.5 py-2 rounded-xl min-h-[40px] active:scale-[0.97] transition-all disabled:opacity-50 ${
        isPublished
          ? 'bg-teal/15 text-teal border border-teal/30'
          : 'bg-gold/15 text-gold border border-gold/30'
      }`}
    >
      {isPending ? (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Saqlanmoqda
        </span>
      ) : isPublished ? (
        '✓ E\'lon qilingan'
      ) : (
        '🚀 E\'lon qilish'
      )}
    </button>
  );
}

export default PublishToggle;