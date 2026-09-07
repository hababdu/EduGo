interface PublishToggleProps {
  status: string;
  onPublish: () => void;
  onUnpublish: () => void;
  isPending?: boolean;
}

/** 86-band — Draft → Review → Published oqimi. Soddalik uchun Draft↔Published almashinuvi qilingan. */
export function PublishToggle({ status, onPublish, onUnpublish, isPending }: PublishToggleProps) {
  const isPublished = status === 'PUBLISHED';

  return (
    <button
      onClick={isPublished ? onUnpublish : onPublish}
      disabled={isPending}
      className={`text-sm px-4 py-2 rounded-full font-medium disabled:opacity-50 ${
        isPublished ? 'bg-surface text-ink-muted' : 'bg-teal text-base'
      }`}
    >
      {isPublished ? "Qoralamaga qaytarish" : "E'lon qilish"}
    </button>
  );
}
