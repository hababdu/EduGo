// src/constants/assignment.ts
import { BookOpen, ClipboardList, FolderOpen, FileText, Image as ImageIcon, FileType, Video } from 'lucide-react';

export type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';
export type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';

export const CATEGORY_META: Record<
  AssignmentCategory,
  { label: string; short: string; cls: string; Icon: any }
> = {
  LESSON: {
    label: 'Dars mavzusi',
    short: 'Dars',
    cls: 'bg-gold/10 text-gold',
    Icon: BookOpen,
  },
  HOMEWORK: {
    label: 'Uy vazifasi',
    short: 'Uy vazifasi',
    cls: 'bg-coral/10 text-coral',
    Icon: ClipboardList,
  },
  RESOURCE: {
    label: "Qo'shimcha resurs",
    short: "Qo'shimcha",
    cls: 'bg-sky-500/10 text-sky-400',
    Icon: FolderOpen,
  },
};

export const CONTENT_META: Record<
  ContentType,
  { label: string; short: string; Icon: any }
> = {
  TEXT: { label: 'Matn', short: 'Matn', Icon: FileText },
  IMAGE: { label: 'Rasm', short: 'Rasm', Icon: ImageIcon },
  PDF: { label: 'PDF fayl', short: 'PDF', Icon: FileType },
  VIDEO: { label: 'YouTube video', short: 'Video', Icon: Video },
};