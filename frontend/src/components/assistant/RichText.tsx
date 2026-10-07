import React from 'react';

/* ============================================================
   RichText — modelning oddiy markdown'ini XAVFSIZ ko'rsatadi.
   HTML qo'yilmaydi (dangerouslySetInnerHTML yo'q), havolalar yo'q:
   faqat **qalin**, `kod`, "-" / "1." ro'yxatlar, sarlavhalar va paragraflar.
   ============================================================ */

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}#{1,3}\s+(.*)$/;

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith('**') ? (
        <strong key={`${keyBase}-b${i++}`} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>
      ) : (
        <code key={`${keyBase}-c${i++}`} className="px-1 py-0.5 rounded bg-white/10 text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      ),
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { t: 'p'; lines: string[] }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] };

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push({ t: 'p', lines: [] }); // paragraf ajratgichi
      continue;
    }
    const h = HEADING.exec(line);
    const b = BULLET.exec(line);
    const o = ORDERED.exec(line);
    const prev = blocks[blocks.length - 1];
    if (h) blocks.push({ t: 'h', text: h[1] });
    else if (b) {
      if (prev?.t === 'ul') prev.items.push(b[1]);
      else blocks.push({ t: 'ul', items: [b[1]] });
    } else if (o) {
      if (prev?.t === 'ol') prev.items.push(o[1]);
      else blocks.push({ t: 'ol', items: [o[1]] });
    } else if (prev?.t === 'p') prev.lines.push(line); // oldingi paragrafning davomi (yoki ajratgichdan keyingi yangisi)
    else blocks.push({ t: 'p', lines: [line] });
  }
  return blocks.filter((b) => !(b.t === 'p' && b.lines.length === 0));
}

export function RichText({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2 break-words">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.t) {
          case 'h':
            return (
              <p key={key} className="font-semibold text-ink">
                {inline(b.text, key)}
              </p>
            );
          case 'ul':
            return (
              <ul key={key} className="list-disc pl-5 space-y-0.5">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="list-decimal pl-5 space-y-0.5">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key}>
                {b.lines.map((l, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(l, `${key}-${j}`)}
                  </React.Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
