import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { TelegramStorageService } from './telegram-storage.service';

function svc(env: Record<string, string | undefined>) {
  return new TelegramStorageService({ get: (k: string) => env[k] } as any);
}
const ok = (json: any) => ({ ok: true, status: 200, json: async () => json, arrayBuffer: async () => new TextEncoder().encode('FILEDATA').buffer });
const err = (status: number, description = '') => ({ ok: false, status, json: async () => ({ description }) });

describe('TelegramStorageService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sozlanmagan bo\'lsa aniq xato beradi (token matnda yo\'q)', async () => {
    const s = svc({ BOT_TOKEN: 'SECRET' });
    expect(s.configured).toBe(false);
    await expect(s.store(Buffer.from('x'), 'a.pdf', 'application/pdf')).rejects.toThrow(ServiceUnavailableException);
  });

  it('faylni sendDocument bilan kanalga yuboradi va file_id qaytaradi', async () => {
    const f = jest.fn().mockResolvedValue(ok({ result: { message_id: 7, document: { file_id: 'FID' } } }));
    global.fetch = f as any;
    const r = await svc({ BOT_TOKEN: 'T', TELEGRAM_STORAGE_CHAT_ID: '-100' }).store(Buffer.from('x'), 'a.pdf', 'application/pdf');
    expect(r).toEqual({ fileId: 'FID', messageId: 7 });
    expect(f.mock.calls[0][0]).toBe('https://api.telegram.org/botT/sendDocument');
    const form = f.mock.calls[0][1].body as FormData;
    expect(form.get('chat_id')).toBe('-100');
  });

  it('Telegram xatosida token javobga sizib chiqmaydi', async () => {
    global.fetch = jest.fn().mockResolvedValue(err(401, 'Unauthorized botT')) as any;
    const s = svc({ BOT_TOKEN: 'TOPSECRET', TELEGRAM_STORAGE_CHAT_ID: '-100' });
    const e = await s.store(Buffer.from('x'), 'a.pdf', 'application/pdf').catch((x) => x);
    expect(e).toBeInstanceOf(HttpException);
    expect(JSON.stringify(e.getResponse())).not.toContain('TOPSECRET');
  });

  it('20 MB dan katta fayl yuklanmaydi (413), Telegram\'ga so\'rov ham ketmaydi', async () => {
    const f = jest.fn();
    global.fetch = f as any;
    const s = svc({ BOT_TOKEN: 'T', TELEGRAM_STORAGE_CHAT_ID: '-100' });
    await expect(s.download('FID', 30 * 1024 * 1024)).rejects.toMatchObject({ status: 413 });
    expect(f).not.toHaveBeenCalled();
  });

  it('getFile 400 ("file is too big") ham 413 ga aylanadi', async () => {
    global.fetch = jest.fn().mockResolvedValue(err(400, 'file is too big')) as any;
    await expect(svc({ BOT_TOKEN: 'T', TELEGRAM_STORAGE_CHAT_ID: '-100' }).download('FID')).rejects.toMatchObject({ status: 413 });
  });

  it('yuklab olish: getFile → file_path → baytlar', async () => {
    const f = jest.fn().mockResolvedValueOnce(ok({ result: { file_path: 'documents/file_1.pdf' } })).mockResolvedValueOnce(ok({}));
    global.fetch = f as any;
    const buf = await svc({ BOT_TOKEN: 'T', TELEGRAM_STORAGE_CHAT_ID: '-100' }).download('FID', 100);
    expect(buf.toString()).toBe('FILEDATA');
    expect(f.mock.calls[1][0]).toBe('https://api.telegram.org/file/botT/documents/file_1.pdf');
  });

  it('botga /start bosmagan foydalanuvchiga tushunarli xabar', async () => {
    global.fetch = jest.fn().mockResolvedValue(err(403, 'bot was blocked')) as any;
    await expect(svc({ BOT_TOKEN: 'T', TELEGRAM_STORAGE_CHAT_ID: '-100' }).sendToChat('1', 'FID')).rejects.toThrow(/\/start/);
  });
});
