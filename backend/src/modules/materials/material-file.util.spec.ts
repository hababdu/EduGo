import { BadRequestException } from '@nestjs/common';
import { MAX_UPLOAD_BYTES, sanitizeFileName, validateUpload } from './material-file.util';

const pdf = Buffer.from('%PDF-1.7\n....');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42')]);
const zip = Buffer.from([0x50, 0x4b, 3, 4]);

describe('validateUpload', () => {
  it('PDF, rasm, video, hujjatni qabul qiladi va to\'g\'ri turga ajratadi', () => {
    expect(validateUpload('qo\'llanma.pdf', 'application/pdf', pdf)).toMatchObject({ kind: 'PDF', inline: true });
    expect(validateUpload('a.PNG', 'image/png', png).kind).toBe('IMAGE');
    expect(validateUpload('a.jpeg', 'image/jpeg', jpg).kind).toBe('IMAGE');
    expect(validateUpload('v.mp4', 'video/mp4', mp4).kind).toBe('VIDEO');
    expect(validateUpload('v.mov', 'video/mp4', mp4)).toMatchObject({ kind: 'VIDEO', mimeType: 'video/quicktime' });
    expect(validateUpload('d.docx', 'application/octet-stream', zip)).toMatchObject({ kind: 'FILE', inline: false });
  });

  it('xavfli turlarni rad etadi (html, svg, exe, js)', () => {
    for (const n of ['x.html', 'x.svg', 'x.exe', 'x.js', 'x.php', 'x']) {
      expect(() => validateUpload(n, 'text/html', Buffer.from('<script>'))).toThrow(BadRequestException);
    }
  });

  it('kengaytma yolg\'on bo\'lsa (exe .pdf deb nomlangan) rad etadi', () => {
    expect(() => validateUpload('virus.pdf', 'application/pdf', Buffer.from('MZ\x90\x00'))).toThrow(/mazmuni/);
    expect(() => validateUpload('rasm.png', 'image/png', pdf)).toThrow(/mazmuni/);
  });

  it('MIME kategoriyasi kengaytmaga mos kelmasa rad etadi', () => {
    expect(() => validateUpload('a.png', 'video/mp4', png)).toThrow(/mos kelmaydi/);
  });

  it('bo\'sh va juda katta faylni rad etadi', () => {
    expect(() => validateUpload('a.pdf', 'application/pdf', Buffer.alloc(0))).toThrow();
    expect(() => validateUpload('a.pdf', 'application/pdf', Buffer.alloc(MAX_UPLOAD_BYTES + 1))).toThrow(/katta/);
  });
});

describe('sanitizeFileName', () => {
  it('yo\'l va boshqaruv belgilarini olib tashlaydi', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeFileName('C:\\x\\y\\dars"1".pdf')).toBe('dars1.pdf');
    expect(sanitizeFileName('')).toBe('fayl');
  });
  it('uzun nomni qisqartiradi, kengaytmani saqlaydi', () => {
    const n = sanitizeFileName('a'.repeat(300) + '.pdf');
    expect(n.length).toBeLessThanOrEqual(124);
    expect(n.endsWith('.pdf')).toBe(true);
  });
});
