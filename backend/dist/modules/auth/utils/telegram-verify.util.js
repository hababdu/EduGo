"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramInitData = verifyTelegramInitData;
const crypto = require("crypto");
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
function verifyTelegramInitData(initData, botToken) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        throw new Error('initData ichida hash topilmadi');
    }
    params.delete('hash');
    const dataCheckArr = [];
    const keys = Array.from(params.keys()).sort();
    for (const key of keys) {
        dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');
    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
    const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
    if (!isValid) {
        throw new Error('initData imzosi noto\'g\'ri — soxta so\'rov bo\'lishi mumkin');
    }
    const authDate = Number(params.get('auth_date'));
    if (!authDate) {
        throw new Error('auth_date topilmadi');
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
        throw new Error('initData muddati o\'tgan, iltimos botni qayta oching');
    }
    const userRaw = params.get('user');
    if (!userRaw) {
        throw new Error('initData ichida foydalanuvchi ma\'lumoti yo\'q');
    }
    let user;
    try {
        user = JSON.parse(userRaw);
    }
    catch {
        throw new Error('Foydalanuvchi ma\'lumotini parse qilib bo\'lmadi');
    }
    return { user, auth_date: authDate };
}
//# sourceMappingURL=telegram-verify.util.js.map