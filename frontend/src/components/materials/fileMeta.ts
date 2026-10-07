import { FileText, Image, FileType, Video } from '../../design/icons';
import type { FileKind } from '../../lib/material-files';

export const FILE_KIND_META: Record<FileKind, { label: string; Icon: typeof FileText; chip: string }> = {
  IMAGE: { label: 'Rasm', Icon: Image, chip: 'bg-sky/10 text-sky' },
  PDF: { label: 'PDF', Icon: FileType, chip: 'bg-coral/10 text-coral' },
  VIDEO: { label: 'Video', Icon: Video, chip: 'bg-gold/10 text-gold' },
  FILE: { label: 'Hujjat', Icon: FileText, chip: 'bg-teal/10 text-teal' },
};
