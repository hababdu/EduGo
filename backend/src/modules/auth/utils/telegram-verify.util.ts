import * as crypto from 'crypto';

/**
 * Telegram WebApp initData'ni tekshirish natijasi.
 * Rasmiy hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramInitData {
  user: TelegramUserPayload;
  auth_date: number;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24 soat — replay attack oldini olish

/**
 * Telegram Mini App'dan kelgan initData satrini tekshiradi va parse qiladi.
 * BOT_TOKEN orqali HMAC-SHA256 imzosini qayta hisoblab, kelgan hash bilan solishtiradi.
 *
 * @throws Error — agar imzo noto'g'ri, muddati o'tgan yoki formatida xatolik bo'lsa
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): TelegramInitData {
  const params = new URLSearchParams(initData);

  const hash = params.get('hash');
  if (!hash) {
    throw new Error('initData ichida hash topilmadi');
  }
  params.delete('hash');

  // 1. data_check_string: qolgan barcha field'lar alifbo tartibida, key=value, \n bilan ajratilgan
  const dataCheckArr: string[] = [];
  // Entries'ni yig'ib, sort qilamiz (URLSearchParams tartibni kafolatlamaydi)
  const keys = Array.from(params.keys()).sort();
  for (const key of keys) {
    dataCheckArr.push(`${key}=${params.get(key)}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  // 2. secret_key = HMAC_SHA256(key="WebAppData", data=botToken)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // 3. computedHash = HMAC_SHA256(key=secretKey, data=dataCheckString)
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // 4. Constant-time solishtirish (timing attack'dan himoya)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(hash, 'hex'),
  );

  if (!isValid) {
    throw new Error('initData imzosi noto\'g\'ri — soxta so\'rov bo\'lishi mumkin');
  }

  // 5. auth_date freshness tekshiruvi (replay attack'dan himoya)
  const authDate = Number(params.get('auth_date'));
  if (!authDate) {
    throw new Error('auth_date topilmadi');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new Error('initData muddati o\'tgan, iltimos botni qayta oching');
  }

  // 6. user field'ini parse qilish
  const userRaw = params.get('user');
  if (!userRaw) {
    throw new Error('initData ichida foydalanuvchi ma\'lumoti yo\'q');
  }

  let user: TelegramUserPayload;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new Error('Foydalanuvchi ma\'lumotini parse qilib bo\'lmadi');
  }

  return { user, auth_date: authDate };
}
