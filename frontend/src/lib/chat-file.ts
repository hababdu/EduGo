import type { AttachedFile } from '../components/ai/mascot-context';

/** AI chatga matn sifatida yuboriladigan fayl turlari (rasm va PDF'ni AI o'qiy olmaydi) */
const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'tsx', 'jsx',
  'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'sql', 'log', 'tex', 'yml', 'yaml', 'ini',
]);
export const MAX_CHAT_FILE_CHARS = 20_000;
const MAX_BYTES = 2 * 1024 * 1024;

export const CHAT_FILE_ACCEPT = '.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.sql,.log,.tex,text/*';

export function isTextLike(f: File): boolean {
  if (f.type.startsWith('text/')) return true;
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXT.has(ext);
}

export class ChatFileError extends Error {}

export async function readChatFile(f: File): Promise<AttachedFile> {
  if (!isTextLike(f)) {
    throw new ChatFileError("Hozircha faqat matnli fayllar (txt, md, csv, kod). Rasm yoki PDF matnini nusxalab yuboring.");
  }
  if (f.size > MAX_BYTES) throw new ChatFileError('Fayl juda katta (2 MB gacha).');
  const raw = await f.text();
  const text = raw.slice(0, MAX_CHAT_FILE_CHARS);
  return { name: f.name, text, truncated: raw.length > text.length };
}
