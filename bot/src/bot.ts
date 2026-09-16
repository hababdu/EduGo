// src/bot.ts
import 'dotenv/config';
import express from 'express';
import { Bot, Context, webhookCallback } from 'grammy';
import {
  getMenuForRole,
  WEBAPP_URL,
} from './keyboards/main-menu.keyboard';
import { registerMenuHandlers } from './handlers/menu.handler';
import { api } from './services/api-client';

/* ============================================================
   ENV
   ============================================================ */
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN topilmadi');

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = Number(process.env.PORT) || 10000;

/* ============================================================
   BOT
   ============================================================ */
const bot = new Bot(BOT_TOKEN);

/* ============ Menu Button ============ */
async function setupMenuButton(): Promise<void> {
  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: 'Ochish',
        web_app: { url: WEBAPP_URL },
      },
    });
    console.log("[bot] Menu button o'rnatildi");
  } catch (err) {
    console.error('[bot] Menu button xatosi:', err);
  }
}

/* ============ /start ============ */
bot.command('start', async (ctx: Context) => {
  const telegramId = String(ctx.from?.id);
  let role = 'STUDENT';
  let firstName = ctx.from?.first_name ?? "do'stim";

  try {
    const info = await api.getUserRole(telegramId);
    role = info.role;
    firstName = info.firstName || firstName;
  } catch {
    // Ro'yxatdan o'tmagan — default STUDENT menyu
  }

  const menu = getMenuForRole(role);

  const greeting: Record<string, string> = {
    STUDENT: `Assalomu alaykum, ${firstName}! 👋\n\n📚 Platformaga kirish uchun menyudan foydalaning:`,
    TEACHER: `Assalomu alaykum, ${firstName}! 👋\n\n🧑‍🏫 O'qituvchi paneli:`,
    ADMIN: `Assalomu alaykum, ${firstName}! 👋\n\n🔧 Admin panel:`,
    SUPER_ADMIN: `Assalomu alaykum, ${firstName}! 👋\n\n⚡ Super Admin:`,
  };

  await ctx.reply(greeting[role] ?? greeting.STUDENT, {
    reply_markup: menu,
  });
});

/* ============ /help ============ */
bot.command('help', async (ctx: Context) => {
  const telegramId = String(ctx.from?.id);
  let role = 'STUDENT';
  try {
    const info = await api.getUserRole(telegramId);
    role = info.role;
  } catch {
    /* noop */
  }

  await ctx.reply(
    'ℹ️ /start — botni qayta ishga tushirish\n' +
      '/help — yordam\n\n' +
      'Yoki menyudan foydalaning 👇',
    { reply_markup: getMenuForRole(role) },
  );
});

/* ============ Menu handlers ============ */
registerMenuHandlers(bot);

/* ============ Fallback ============ */
bot.on('message:text', async (ctx: Context) => {
  const telegramId = String(ctx.from?.id);
  let role = 'STUDENT';

  try {
    const info = await api.getUserRole(telegramId);
    role = info.role;
  } catch {
    /* noop */
  }

  await ctx.reply('Iltimos, menyudan foydalaning 👇', {
    reply_markup: getMenuForRole(role),
  });
});

/* ============ Error ============ */
bot.catch((err) => {
  console.error('[bot] Xato:', err.error);
});

/* ============================================================
   START
   ============================================================ */
async function startWebhookMode() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use(
    '/webhook',
    webhookCallback(bot, 'express', {
      secretToken: process.env.WEBHOOK_SECRET,
    }),
  );

  app.use((_req, res) => res.status(404).send('Not found'));

  app.listen(PORT, async () => {
    await bot.api.setWebhook(`${WEBHOOK_URL!.replace(/\/$/, '')}/webhook`);
    await setupMenuButton();
    console.log(`[bot] Webhook: ${WEBHOOK_URL} (port ${PORT})`);
  });
}

async function startPollingMode() {
  await bot.api.deleteWebhook({ drop_pending_updates: true });
  await setupMenuButton();

  bot.start({
    onStart: (info) => {
      console.log(`[bot] Polling: @${info.username}`);
    },
  });
}

/* ============ Shutdown ============ */
async function shutdown(signal: string) {
  console.log(`[bot] ${signal} — to'xtatilmoqda...`);
  try {
    await bot.stop();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/* ============ Boshlash ============ */
if (WEBHOOK_URL) {
  startWebhookMode();
} else {
  startPollingMode();
}