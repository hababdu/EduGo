import 'dotenv/config';
import { Bot } from 'grammy';
import { mainMenuKeyboard } from './keyboards/main-menu.keyboard';
import { registerMenuHandlers } from './handlers/menu.handler';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN .env faylida topilmadi');
}

const bot = new Bot(BOT_TOKEN);

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Assalomu alaykum, ${ctx.from?.first_name}! 👋\n\n` +
      'Bu — online o\'quv platformamiz boti. Quyidagi menyudan foydalaning:',
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

bot.start();
console.log('Telegram bot ishga tushdi (polling rejimida)');
