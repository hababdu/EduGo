// src/bot.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import { Bot, Context, webhookCallback } from 'grammy';
import {
  getMenuForRole,
  WEBAPP_URL,
} from './keyboards/main-menu.keyboard';
import { registerMenuHandlers } from './handlers/menu.handler';
import { api } from './services/api-client';

/* ============================================================
   ENV TEKSHIRUVI
   ============================================================ */
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('❌ BOT_TOKEN .env faylida topilmadi');
}

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = Number(process.env.PORT) || 10000;

/* ============================================================
   BOT INSTANCE
   ============================================================ */
const bot = new Bot(BOT_TOKEN);

/* ============================================================
   MENU BUTTON — yozish maydoni yonidagi "Ochish" tugmasi
   ============================================================ */
async function setupMenuButton(): Promise<void> {
  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: 'Ochish',
        web_app: {url:WEBAPP_URL},
      },
    });
    console.log('[bot] ✅ Menu button o\'rnatildi:',WEBAPP_URL);
  } catch (err) {
    console.error('[bot] ❌ Menu button xatosi:', err);
  }
}

/* ============================================================
   /start KOMANDASI — rolga qarab menyu
   ============================================================ */
bot.command('start', async (ctx: Context) => {
  // Ilovadan (PWA/APK) kirish: /start login_<id>
  const payload = typeof ctx.match === 'string' ? ctx.match.trim() : '';
  if (payload.startsWith('login_') && ctx.from) {
    try {
      await api.confirmAppLogin(payload.slice(6), {
        id: ctx.from.id,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        username: ctx.from.username,
      });
      await ctx.reply('✅ Ilovaga kirish tasdiqlandi. Ilovaga qayting — avtomatik kirasiz.');
    } catch {
      await ctx.reply('⚠️ Kod eskirgan. Ilovada "Telegram orqali kirish" tugmasini qayta bosing.');
    }
    return;
  }

  // Ota-ona taklifi: /start parent_<kod>
  if (payload.startsWith('parent_') && ctx.from) {
    try {
      const r = await api.linkParent(payload.slice(7), {
        id: ctx.from.id,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        username: ctx.from.username,
      });
      await ctx.reply(
        `✅ Siz ${r.childName} ning ota-onasi sifatida ulandingiz.\n\n` +
          `Davomat, vazifa va to'lov haqida xabarlar shu yerga keladi. Batafsil ko'rish uchun "Ochish" tugmasini bosing.`,
        { reply_markup: getMenuForRole('PARENT') },
      );
    } catch (err: any) {
      const msg = `${err?.message ?? ''} ${typeof err?.body === 'string' ? err.body : ''}`;
      await ctx.reply(
        msg.includes('boshqa rolda')
          ? '⚠️ Bu Telegram akkaunt boshqa rolda (o\'quvchi/o\'qituvchi) ishlatilgan. Ota-ona sifatida boshqa akkaunt bilan ulaning.'
          : '⚠️ Taklif eskirgan yoki ishlatilgan. O\'quvchidan yangi havola so\'rang.',
      );
    }
    return;
  }

  const telegramId = String(ctx.from?.id);
  let role = 'STUDENT';
  let firstName = ctx.from?.first_name ?? "do'stim";

  try {
    const info = await api.getUserRole(telegramId);
    role = info.role;
    firstName = info.firstName || firstName;

    console.log(`[bot] /start: ${firstName} (${role})`);
  } catch (err) {
    // Ro'yxatdan o'tmagan — default STUDENT menyu
    console.log(`[bot] /start: yangi foydalanuvchi (${firstName})`);
  }

  const menu = getMenuForRole(role);

  const greeting: Record<string, string> = {
    STUDENT:
      `Assalomu alaykum, ${firstName}! 👋\n\n` +
      `📚 Platformaga kirish uchun menyudan foydalaning:`,
    TEACHER:
      `Assalomu alaykum, ${firstName}! 👋\n\n` +
      `🧑‍🏫 O'qituvchi paneli:`,
    ADMIN:
      `Assalomu alaykum, ${firstName}! 👋\n\n` +
      `🔧 Admin panel:`,
    SUPER_ADMIN:
      `Assalomu alaykum, ${firstName}! 👋\n\n` +
      `⚡ Super Admin:`,
    PARENT:
      `Assalomu alaykum, ${firstName}! 👋\n\n` +
      `👨‍👩‍👧 Ota-ona paneli — farzandingiz natijalarini "Ochish" tugmasi orqali ko'ring:`,
  };

  await ctx.reply(greeting[role] ?? greeting.STUDENT, {
    reply_markup: menu,
  });
});

/* ============================================================
   /help KOMANDASI
   ============================================================ */
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
    'ℹ️ *Komandalar:*\n\n' +
      '/start — botni qayta ishga tushirish\n' +
      '/help — yordam\n' +
      '/profile — profilingiz\n\n' +
      'Yoki quyidagi menyudan foydalaning 👇',
    {
      parse_mode: 'Markdown',
      reply_markup: getMenuForRole(role),
    },
  );
});

/* ============================================================
   /profile KOMANDASI
   ============================================================ */
bot.command('profile', async (ctx: Context) => {
  const telegramId = String(ctx.from?.id);

  try {
    const summary = await api.getStudentSummary(telegramId);
    await ctx.reply(
      `👤 *${summary.firstName}*\n\n` +
        `📊 Ball: *${summary.totalScore}*\n` +
        `⚡ XP: *${summary.totalXp}*\n` +
        `🎯 Level: *${summary.level}*\n` +
        `🏆 Reyting: *#${summary.rank}*\n` +
        `🔥 Streak: *${summary.streak} kun*`,
      { parse_mode: 'Markdown' },
    );
  } catch (err) {
    await ctx.reply(
      '⚠️ Siz hali platformaga kirmagansiz.\n\n' +
        '"📚 Darsni boshlash" tugmasini bosib ro\'yxatdan o\'ting.',
    );
  }
});

/* ============================================================
   MENYU HANDLERLARI
   ============================================================ */
registerMenuHandlers(bot);

/* ============================================================
   FALLBACK — tanilmagan matn
   ============================================================ */
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

/* ============================================================
   XATO HANDLER
   ============================================================ */
bot.catch((err) => {
  console.error('[bot] ❌ Xato:', err.error);
});

/* ============================================================
   WEBHOOK REJIMI (PRODUCTION)
   ============================================================ */
async function startWebhookMode(): Promise<void> {
  const app = express();

  // JSON parsing (Telegram webhook uchun)
  app.use(express.json({ limit: '1mb' }));

  /* ---------- Health check ---------- */
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      webhookUrl: WEBHOOK_URL,
    });
  });

  /* ---------- Telegram webhook ---------- */
  app.use(
    '/webhook',
    webhookCallback(bot, 'express', {
      secretToken: process.env.WEBHOOK_SECRET,
    }),
  );

  /* ---------- 404 ---------- */
  app.use((_req: Request, res: Response) => {
    res.status(404).send('Not found');
  });

  /* ---------- Server start ---------- */
  app.listen(PORT, async () => {
    console.log(`[bot] 🚀 Server ishga tushdi (port ${PORT})`);

    try {
      const webhookFullUrl = `${WEBHOOK_URL!.replace(/\/$/, '')}/webhook`;

      await bot.api.setWebhook(webhookFullUrl, {
        secret_token: process.env.WEBHOOK_SECRET,
        drop_pending_updates: true,
      });

      console.log(`[bot] ✅ Webhook o'rnatildi: ${webhookFullUrl}`);

      await setupMenuButton();
    } catch (err) {
      console.error('[bot] ❌ Webhook o\'rnatishda xato:', err);
    }
  });
}

/* ============================================================
   POLLING REJIMI (DEVELOPMENT)
   ============================================================ */
async function startPollingMode(): Promise<void> {
  console.log('[bot] 🔄 Polling rejimi (lokal development)');

  // Avvalgi webhook'ni o'chirish
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  await setupMenuButton();

  bot.start({
    onStart: (info) => {
      console.log(`[bot] ✅ Bot ishga tushdi: @${info.username}`);
    },
  });
}

/* ============================================================
   GRACEFUL SHUTDOWN
   ============================================================ */
async function shutdown(signal: string): Promise<void> {
  console.log(`[bot] 🛑 ${signal} — to'xtatilmoqda...`);

  try {
    await bot.stop();
    console.log('[bot] ✅ To\'xtatildi');
    process.exit(0);
  } catch (err) {
    console.error('[bot] ❌ To\'xtatishda xato:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/* ---------- Unhandled errors ---------- */
process.on('unhandledRejection', (err) => {
  console.error('[bot] ❌ Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[bot] ❌ Uncaught exception:', err);
  process.exit(1);
});

/* ============================================================
   ISHGA TUSHIRISH
   ============================================================ */
console.log('[bot] 🚀 Bot ishga tushmoqda...');
console.log('[bot] Env:', {
  hasBotToken: !!BOT_TOKEN,
  hasWebappUrl: !!WEBAPP_URL,
  hasWebhookUrl: !!WEBHOOK_URL,
  hasBackendUrl: !!process.env.BACKEND_API_URL,
  hasInternalSecret: !!process.env.BOT_INTERNAL_SECRET,
  mode: WEBHOOK_URL ? 'webhook' : 'polling',
  port: PORT,
});

if (WEBHOOK_URL) {
  startWebhookMode();
} else {
  startPollingMode();
}