import * as crypto from 'crypto';
import { verifyTelegramInitData } from './telegram-verify.util';

const BOT_TOKEN = 'test-bot-token-12345';

/** Haqiqiy Telegram klienti yaratadigan initData satrini simulyatsiya qiladi */
function buildValidInitData(overrides: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: 123456, first_name: 'Ali', username: 'ali_test' }),
    ...overrides,
  });

  const dataCheckString = Array.from(params.keys())
    .sort()
    .map((k) => `${k}=${params.get(k)}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.set('hash', hash);
  return params.toString();
}

describe('verifyTelegramInitData (Phase 3: xavfsizlik yuragi)', () => {
  it('to\'g\'ri imzolangan initData\'ni qabul qiladi', () => {
    const initData = buildValidInitData();
    const result = verifyTelegramInitData(initData, BOT_TOKEN);
    expect(result.user.id).toBe(123456);
    expect(result.user.first_name).toBe('Ali');
  });

  it('noto\'g\'ri BOT_TOKEN bilan tekshirilsa rad etadi', () => {
    const initData = buildValidInitData();
    expect(() => verifyTelegramInitData(initData, 'boshqa-token')).toThrow();
  });

  it('hash qo\'lda o\'zgartirilgan (soxta) initData\'ni rad etadi', () => {
    const initData = buildValidInitData();
    // Hujumchi user.id'ni o'zgartirishga urinadi, lekin hash eskicha qoladi
    const tampered = initData.replace('123456', '999999');
    expect(() => verifyTelegramInitData(tampered, BOT_TOKEN)).toThrow();
  });

  it('muddati o\'tgan (24 soatdan eski) initData\'ni rad etadi', () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 25 * 60 * 60);
    const initData = buildValidInitData({ auth_date: oldTimestamp });
    expect(() => verifyTelegramInitData(initData, BOT_TOKEN)).toThrow(/muddati o'tgan/);
  });

  it('hash umuman yo\'q bo\'lsa xato beradi', () => {
    expect(() => verifyTelegramInitData('user=test&auth_date=123', BOT_TOKEN)).toThrow();
  });
});
