import 'dotenv/config';
import express from 'express';
import { Bot, webhookCallback } from 'grammy';
import { mainMenuKeyboard, WEBAPP_URL } from './keyboards/main-menu.keyboard';
import { registerMenuHandlers } from './handlers/menu.handler';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN .env faylida topilmadi');
}

const bot = new Bot(BOT_TOKEN);

/**
 * Persistent Menu Button — yozish maydonining chap tomonidagi doimiy tugma.
 * Bu ENG ISHONCHLI usul: initData to'liq keladi, foydalanuvchi /start
 * yozishi ham shart emas, tugma har doim ko'rinadi.
 */
async function setupMenuButton() {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Ochish',
      web_app: { url: WEBAPP_URL },
    },
  });
}

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Assalomu alaykum, ${ctx.from?.first_name}! 👋\n\n` +
      'Bu — online o\'quv platformamiz boti. Platformani ochish uchun ' +
      'yozish maydoni yonidagi "Ochish" tugmasini bosing, yoki quyidagi ' +
      'menyudan foydalaning:',
    { reply_markup: mainMenuKeyboard },
  );
});

registerMenuHandlers(bot);

// Tanilmagan matn kelsa — menyuga yo'naltirish
bot.on('message:text', async (ctx) => {
  await ctx.reply('Iltimos, quyidagi menyudan foydalaning 👇', {
    reply_markup: mainMenuKeyboard,
  });
});

bot.catch((err) => {
  console.error('Bot xatosi:', err.error);
});

/**
 * Ikki rejim bir xil koddan ishlaydi:
 *
 * - WEBHOOK_URL berilgan bo'lsa (production, masalan Render Web Service) —
 *   webhook rejimi: kichik Express server ochiladi, Telegram xabar kelganda
 *   shu serverga HTTP POST yuboradi. Bepul Render tarifida bu MUHIM,
 *   chunki xuddi shu HTTP so'rovning o'zi uxlab qolgan servisni uyg'otadi.
 *
 * - WEBHOOK_URL berilmagan bo'lsa (lokal development) — oddiy polling
 *   rejimi, `npm run start:dev` bilan hech qanday qo'shimcha sozlashsiz ishlaydi.
 */
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT ? Number(process.env.PORT) : 10000;

if (WEBHOOK_URL) {
  const app = express();
  app.use(express.json());

  // Render/UptimeRobot kabi tashqi "ping" xizmatlari uchun oddiy health-check
  app.get('/', (_req, res) => {
    res.send('Bot ishlayapti ✅');
  });

  app.use('/webhook', webhookCallback(bot, 'express'));

  app.listen(PORT, async () => {
    await bot.api.setWebhook(`${WEBHOOK_URL.replace(/\/$/, '')}/webhook`);
    await setupMenuButton();
    console.log(`Bot webhook rejimida ishga tushdi: ${WEBHOOK_URL} (port ${PORT})`);
  });
} else {
  bot.start({
    onStart: () => {
      setupMenuButton().catch((err) => console.error('Menu button xatosi:', err));
      console.log('Bot polling rejimida ishga tushdi (lokal development)');
    },
  });
}
