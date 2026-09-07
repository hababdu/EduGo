const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-surfaceRaised text-ink-muted',
  REVIEW: 'bg-gold-soft text-gold',
  PUBLISHED: 'bg-teal-soft text-teal',
  ARCHIVED: 'bg-coral/10 text-coral',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama',
  REVIEW: "Ko'rib chiqilmoqda",
  PUBLISHED: "E'lon qilingan",
  ARCHIVED: 'Arxivlangan',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] ?? 'bg-surface text-ink-muted'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
