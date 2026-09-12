export type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';
export type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  category: AssignmentCategory;
  groupId: string;
  mediaUrl?: string;
}

export const CATEGORY_META: Record<
  AssignmentCategory,
  { label: string; short: string; badge: string }
> = {
  LESSON: {
    label: 'Dars mavzusi',
    short: 'Dars',
    badge: 'bg-gold/10 text-gold',
  },
  HOMEWORK: {
    label: 'Uy vazifasi',
    short: 'Uy vazifasi',
    badge: 'bg-coral/10 text-coral',
  },
  RESOURCE: {
    label: "Qo'shimcha resurs",
    short: "Qo'shimcha",
    badge: 'bg-sky-500/10 text-sky-400',
  },
};

export const CONTENT_META: Record<
  ContentType,
  { label: string; emoji: string }
> = {
  TEXT: { label: 'Matn', emoji: '📄' },
  IMAGE: { label: 'Rasm', emoji: '🖼️' },
  PDF: { label: 'PDF fayl', emoji: '📑' },
  VIDEO: { label: 'YouTube Video', emoji: '📹' },
};