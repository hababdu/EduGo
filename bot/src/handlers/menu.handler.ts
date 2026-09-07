import { Bot, InlineKeyboard } from 'grammy';
import { MENU_LABELS, WEBAPP_URL } from '../keyboards/main-menu.keyboard';
import { api } from '../services/api-client';

const NOT_REGISTERED_MSG =
  '⚠️ Siz hali platformaga kirmagansiz.\n"📚 Darsni boshlash" tugmasini bosib ro\'yxatdan o\'ting.';

function withErrorHandling(fn: (ctx: any) => Promise<void>) {
  return async (ctx: any) => {
    try {
      await fn(ctx);
    } catch (err: any) {
      if (err.message === 'NOT_REGISTERED') {
        await ctx.reply(NOT_REGISTERED_MSG);
      } else {
        console.error(err);
        await ctx.reply('❌ Xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring.');
      }
    }
  };
}

export function registerMenuHandlers(bot: Bot) {
  /**
   * "Darsni boshlash" — ReplyKeyboard tugmasi shunchaki shu handlerni ishga
   * tushiradi, u esa INLINE tugma yuboradi. Inline keyboard'dagi web_app
   * tugmasi initData'ni TO'LIQ beradi (ReplyKeyboard'dan farqli o'laroq).
   */
  bot.hears(
    MENU_LABELS.START_LESSON,
    async (ctx) => {
      await ctx.reply('Platformani ochish uchun quyidagi tugmani bosing 👇', {
        reply_markup: new InlineKeyboard().webApp('📚 Ochish', WEBAPP_URL),
      });
    },
  );

  bot.hears(
    MENU_LABELS.PROFILE,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from.id);
      const summary = await api.getStudentSummary(telegramId);

      await ctx.reply(
        `👤 *${summary.firstName}*\n\n` +
          `📊 Ball: *${summary.totalScore}*\n` +
          `⚡ XP: *${summary.totalXp}*\n` +
          `🎯 Level: *${summary.level}*\n` +
          `🏆 Reytingdagi o'rin: *#${summary.rank}*\n` +
          `🔥 Streak: *${summary.streak} kun*`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(
    MENU_LABELS.SCORES,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from.id);
      const summary = await api.getStudentSummary(telegramId);
      await ctx.reply(
        `🏆 Umumiy ballingiz: *${summary.totalScore}*\n\n` +
          `Batafsil ball tarixini ko'rish uchun "📚 Darsni boshlash" orqali platformaga o'ting → "Ballarim" bo'limi.`,
        { parse_mode: 'Markdown' },
      );
    }),
  );

  bot.hears(
    MENU_LABELS.RESULTS,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from.id);
      const results = await api.getRecentResults(telegramId);

      if (results.length === 0) {
        await ctx.reply('📊 Sizda hali tugatilgan testlar yo\'q.');
        return;
      }

      const lines = results.map((r) => {
        const icon = r.passed ? '✅' : '❌';
        return `${icon} ${r.test.title} — ${r.score}/${r.maxScore} (${r.percent.toFixed(0)}%)`;
      });

      await ctx.reply(`📊 *So'nggi natijalaringiz:*\n\n${lines.join('\n')}`, {
        parse_mode: 'Markdown',
      });
    }),
  );

  bot.hears(
    MENU_LABELS.ACHIEVEMENTS,
    withErrorHandling(async (ctx) => {
      const telegramId = String(ctx.from.id);
      const achievements = await api.getAchievements(telegramId);

      if (achievements.length === 0) {
        await ctx.reply('🏅 Sizda hali yutuqlar yo\'q. Testlarni bajarib, birinchisini qo\'lga kiriting!');
        return;
      }

      const lines = achievements.map((a) => `🏅 ${a.achievement.title}`);
      await ctx.reply(`🏅 *Yutuqlaringiz:*\n\n${lines.join('\n')}`, {
        parse_mode: 'Markdown',
      });
    }),
  );

  bot.hears(
    MENU_LABELS.RANKING,
    withErrorHandling(async (ctx) => {
      const top = await api.getTopRanking();
      const lines = top.map((r, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
        const name = r.user.username ? `@${r.user.username}` : r.user.firstName;
        return `${medal} ${name} — ${r.totalScore} ball`;
      });
      await ctx.reply(`🏆 *TOP-10 reyting:*\n\n${lines.join('\n')}`, {
        parse_mode: 'Markdown',
      });
    }),
  );

  bot.hears(
    MENU_LABELS.ANNOUNCEMENTS,
    withErrorHandling(async (ctx) => {
      const announcements = await api.getAnnouncements();

      if (announcements.length === 0) {
        await ctx.reply('📢 Hozircha e\'lonlar yo\'q.');
        return;
      }

      for (const a of announcements) {
        await ctx.reply(`📢 *${a.title}*\n\n${a.body}`, { parse_mode: 'Markdown' });
      }
    }),
  );

  bot.hears(MENU_LABELS.HELP, async (ctx) => {
    await ctx.reply(
      'ℹ️ *Yordam*\n\n' +
        '📚 Darsni boshlash — platformaga kirish\n' +
        '👤 Profilim — shaxsiy ma\'lumotlar\n' +
        '🏆 Ballarim / Reyting — ball va o\'rningiz\n' +
        '📊 Natijalarim — testlar tarixi\n' +
        '🏅 Yutuqlarim — badge\'lar\n' +
        '📢 E\'lonlar — so\'nggi xabarlar\n\n' +
        'Savol bo\'lsa, o\'qituvchingizga murojaat qiling.',
      { parse_mode: 'Markdown' },
    );
  });
}
