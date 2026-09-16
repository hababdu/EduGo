// src/handlers/menu.handler.ts
import { Bot, Context, InlineKeyboard } from 'grammy';
import {
  MENU_LABELS,
  WEBAPP_URL,
  getMenuForRole,
} from '../keyboards/main-menu.keyboard';
import {
  api,
  NotRegisteredError,
  BotApiError,
} from '../services/api-client';

const NOT_REGISTERED_MSG =
  '⚠️ Siz hali platformaga kirmagansiz.\n\n' +
  '"📚 Darsni boshlash" tugmasini bosib ro\'yxatdan o\'ting.';

/* ============================================================
   ERROR WRAPPER
   ============================================================ */
function withErrorHandling(
  fn: (ctx: Context) => Promise<void>,
): (ctx: Context) => Promise<void> {
  return async (ctx: Context) => {
    try {
      await fn(ctx);
    } catch (err) {
      if (err instanceof NotRegisteredError) {
        await ctx.reply(NOT_REGISTERED_MSG);
        return;
      }
      if (err instanceof BotApiError) {
        console.error('[menu] BotApiError:', err.message);
        await ctx.reply("❌ Server bilan aloqa yo'q.");
        return;
      }
      console.error('[menu] Unexpected:', err);
      await ctx.reply('❌ Xatolik yuz berdi.');
    }
  };
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

async function getUserRole(ctx: Context): Promise<string> {
  const telegramId = String(ctx.from?.id);
  try {
    const info = await api.getUserRole(telegramId);
    return info.role;
  } catch {
    return 'STUDENT';
  }
}

/* ============================================================
   REGISTER HANDLERS
   ============================================================ */
export function registerMenuHandlers(bot: Bot) {
  /* ============================================================
     DARSNI BOSHLASH / PLATFORMANI OCHISH (Common)
     ============================================================ */
  bot.hears(
    [MENU_LABELS.START_LESSON, MENU_LABELS.OPEN_PLATFORM],
    async (ctx) => {
      await ctx.reply('Platformani ochish uchun quyidagi tugmani bosing 👇', {
        reply_markup: new InlineKeyboard().webApp(
          '🚀 Ochish',
          WEBAPP_URL,
        ),
      });
    },
  );

  /* ============================================================
     STUDENT HANDLERS
     ============================================================ */

  bot.hears(
    MENU_LABELS.PROFILE,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const summary = await api.getStudentSummary(telegramId);

      await ctx.reply(
        `👤 *${escapeMd(summary.firstName)}*\n\n` +
          `📊 Ball: *${summary.totalScore}*\n` +
          `⚡ XP: *${summary.totalXp}*\n` +
          `🎯 Level: *${summary.level}*\n` +
          `🏆 Reyting: *#${summary.rank}*\n` +
          `🔥 Streak: *${summary.streak} kun*`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(
    MENU_LABELS.SCORES,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const summary = await api.getStudentSummary(telegramId);
      await ctx.reply(`🏆 Umumiy ballingiz: *${summary.totalScore}*`, {
        parse_mode: 'Markdown',
      });
    }),
  );

  bot.hears(
    MENU_LABELS.RESULTS,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const results = await api.getRecentResults(telegramId, 5);

      if (results.length === 0) {
        await ctx.reply('📊 Hali tugatilgan testlar yo\'q.');
        return;
      }

      const lines = results.map((r) => {
        const icon = r.passed ? '✅' : '❌';
        return `${icon} ${escapeMd(r.test.title)} — ${r.score}/${r.maxScore} (${Math.round(r.percent)}%)`;
      });

      await ctx.reply(
        `📊 *So'nggi natijalar:*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(
    MENU_LABELS.ACHIEVEMENTS,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const achievements = await api.getAchievements(telegramId);

      if (achievements.length === 0) {
        await ctx.reply("🏅 Hali yutuqlar yo'q.");
        return;
      }

      const lines = achievements.map(
        (a) => `🏅 ${escapeMd(a.achievement.title)}`,
      );
      await ctx.reply(
        `🏅 *Yutuqlaringiz:*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  /* ============================================================
     TEACHER HANDLERS
     ============================================================ */

  bot.hears(
    MENU_LABELS.DASHBOARD,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const data = await api.getTeacherOverview(telegramId);

      await ctx.reply(
        `📊 *Dashboard*\n\n` +
          `👥 Guruhlar: *${data.groupsCount}*\n` +
          `👤 Talabalar: *${data.studentsCount}*\n` +
          `📝 Materiallar: *${data.assignmentsCount}*\n` +
          `🧠 Testlar: *${data.assignedTestsCount}*`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(
    MENU_LABELS.MY_GROUPS,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const groups = await api.getTeacherGroups(telegramId);

      if (groups.length === 0) {
        await ctx.reply("👥 Hali guruhlaringiz yo'q.");
        return;
      }

      const lines = groups.map(
        (g) => `👥 *${escapeMd(g.name)}* — ${g.studentsCount} talaba`,
      );
      await ctx.reply(
        `👥 *Guruhlaringiz:*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(MENU_LABELS.MATERIALS, async (ctx) => {
    await ctx.reply('📝 Materiallarni platformada boshqaring:', {
      reply_markup: new InlineKeyboard().webApp(
        '📚 Materiallar',
        `${WEBAPP_URL}/teacher/content/courses`,
      ),
    });
  });

  bot.hears(MENU_LABELS.TESTS, async (ctx) => {
    await ctx.reply('🧠 Testlarni platformada boshqaring:', {
      reply_markup: new InlineKeyboard().webApp(
        '📝 Testlar',
        `${WEBAPP_URL}/teacher/tests`,
      ),
    });
  });

  bot.hears(MENU_LABELS.STATS, async (ctx) => {
    await ctx.reply("📈 Statistikani platformada ko'ring:", {
      reply_markup: new InlineKeyboard().webApp(
        '📊 Statistika',
        `${WEBAPP_URL}/teacher`,
      ),
    });
  });

  /* ============================================================
     ADMIN HANDLERS
     ============================================================ */

  bot.hears(
    MENU_LABELS.OVERVIEW,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from?.id);
      const data = await api.getAdminOverview(telegramId);

      await ctx.reply(
        `📊 *Overview*\n\n` +
          `👥 Talabalar: *${data.students}*\n` +
          `✅ Faol: *${data.activeStudents}*\n` +
          `🧑‍🏫 O'qituvchilar: *${data.teachers}*\n` +
          `📚 Kurslar: *${data.courses}*\n` +
          `📝 Testlar: *${data.tests}*\n` +
          `🏆 Jami ball: *${data.totalScoreIssued}*`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(MENU_LABELS.USERS, async (ctx) => {
    await ctx.reply('👥 Foydalanuvchilarni boshqarish:', {
      reply_markup: new InlineKeyboard().webApp(
        '👥 Users',
        `${WEBAPP_URL}/admin/users`,
      ),
    });
  });

  bot.hears(MENU_LABELS.GROUPS, async (ctx) => {
    await ctx.reply('📁 Guruhlarni boshqarish:', {
      reply_markup: new InlineKeyboard().webApp(
        '📁 Guruhlar',
        `${WEBAPP_URL}/admin/groups`,
      ),
    });
  });

  bot.hears(MENU_LABELS.ADMIN_TESTS, async (ctx) => {
    await ctx.reply('📝 Testlarni boshqarish:', {
      reply_markup: new InlineKeyboard().webApp(
        '📝 Testlar',
        `${WEBAPP_URL}/admin/tests`,
      ),
    });
  });

  bot.hears(MENU_LABELS.ADMIN_STATS, async (ctx) => {
    await ctx.reply('📈 Admin statistikasi:', {
      reply_markup: new InlineKeyboard().webApp(
        '📊 Statistika',
        `${WEBAPP_URL}/admin`,
      ),
    });
  });

  bot.hears(MENU_LABELS.ADMIN_PANEL, async (ctx) => {
    await ctx.reply('🔧 Boshqaruv paneli:', {
      reply_markup: new InlineKeyboard().webApp(
        '🔧 Admin panel',
        `${WEBAPP_URL}/admin`,
      ),
    });
  });

  /* ============================================================
     COMMON HANDLERS
     ============================================================ */

  bot.hears(
    MENU_LABELS.RANKING,
    withErrorHandling(async (ctx) => {
      const top = await api.getTopRanking(10);
      if (top.length === 0) {
        await ctx.reply("🏆 Reyting bo'sh.");
        return;
      }

      const lines = top.map((r, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
        const name = r.user.username
          ? `@${r.user.username}`
          : escapeMd(r.user.firstName);
        return `${medal} ${name} — ${r.totalScore}`;
      });

      await ctx.reply(
        `🏆 *TOP-10:*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(
    MENU_LABELS.ANNOUNCEMENTS,
    withErrorHandling(async (ctx) => {
      const announcements = await api.getAnnouncements(5);
      if (announcements.length === 0) {
        await ctx.reply("📢 E'lonlar yo'q.");
        return;
      }
      for (const a of announcements) {
        await ctx.reply(
          `📢 *${escapeMd(a.title)}*\n\n${escapeMd(a.body)}`,
          { parse_mode: 'Markdown' },
        );
      }
    }),
  );

  bot.hears(MENU_LABELS.HELP, async (ctx) => {
    const role = await getUserRole(ctx);

    const helpText: Record<string, string> = {
      STUDENT:
        'ℹ️ *Yordam — Student*\n\n' +
        '📚 Darsni boshlash — platformaga kirish\n' +
        '👤 Profilim — shaxsiy ma\'lumotlar\n' +
        '🏆 Ballarim — umumiy ball\n' +
        '📊 Natijalarim — test tarixi\n' +
        '🏅 Yutuqlarim — badge\'lar\n' +
        '🏆 Reyting — TOP-10\n' +
        '📢 E\'lonlar — so\'nggi xabarlar',

      TEACHER:
        'ℹ️ *Yordam — Teacher*\n\n' +
        '📚 Platformani ochish — Mini App\n' +
        '📊 Dashboard — umumiy ko\'rsatkichlar\n' +
        '👥 Guruhlarim — guruhlar ro\'yxati\n' +
        '📝 Materiallar — dars materiallari\n' +
        '🧠 Testlar — testlar boshqaruvi\n' +
        '📈 Statistika — talabalar statistikasi',

      ADMIN:
        'ℹ️ *Yordam — Admin*\n\n' +
        '📚 Platformani ochish — Mini App\n' +
        '📊 Overview — umumiy statistika\n' +
        '👥 Foydalanuvchilar — barcha userlar\n' +
        '📁 Guruhlar — guruhlar boshqaruvi\n' +
        '📝 Testlar — testlar\n' +
        '📈 Statistika — chuqur tahlil\n' +
        '🔧 Boshqaruv — admin panel',
    };

    await ctx.reply(helpText[role] ?? helpText.STUDENT, {
      parse_mode: 'Markdown',
      reply_markup: getMenuForRole(role),
    });
  });
}