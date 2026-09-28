const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Qoralama', cls: 'bg-white/5 text-ink-muted' },
  PUBLISHED: { label: 'Faol', cls: 'bg-teal/10 text-teal' },
  ARCHIVED: { label: 'Arxiv', cls: 'bg-coral/10 text-coral' },
  ACTIVE: { label: 'Faol', cls: 'bg-teal/10 text-teal' },
  BLOCKED: { label: 'Bloklangan', cls: 'bg-red-500/10 text-red-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, cls: 'bg-white/5 text-ink-muted' };
  return (
    <span
      className={`text-[10px] px-2 py-1 rounded-lg font-semibold shrink-0 ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}