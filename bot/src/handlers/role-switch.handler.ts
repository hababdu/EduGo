// src/handlers/role-switch.handler.ts
// Super admin: botda (va Mini App'da) boshqa rolni "kiyib" ko'rish. Haqiqiy rol o'zgarmaydi.
import { Bot, Context, InlineKeyboard } from 'grammy';
import { MENU_LABELS, getMenuForRole } from '../keyboards/main-menu.keyboard';
import { api, apiErrorText } from '../services/api-client';

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "🎓 O'quvchi",
  TEACHER: "🧑‍🏫 O'qituvchi",
  ADMIN: '🔧 Admin',
  SUPER_ADMIN: '⚡ Super admin',
};

const NEEDS_ORG = new Set(['STUDENT', 'TEACHER', 'ADMIN']);

function roleKeyboard(active: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of ['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN']) {
    kb.text(`${r === active ? '✅ ' : ''}${ROLE_LABEL[r]}`, `sr:${r}`).row();
  }
  return kb;
}

export function registerRoleSwitchHandlers(bot: Bot) {
  async function showRoles(ctx: Context, edit = false) {
    const tid = String(ctx.from?.id);
    try {
      const o = await api.getSwitchOptions(tid);
      const text =
        '🔁 *Rolni almashtirish*\n\n' +
        `Hozirgi rol: *${ROLE_LABEL[o.activeRole] ?? o.activeRole}*` +
        (o.organizationName ? `\nMaktab: *${o.organizationName.replace(/[*_`\[]/g, '')}*` : '') +
        "\n\nTanlangan rolda bot menyusi va Mini App shu rol sifatida ochiladi. Haqiqiy rolingiz (super admin) o'zgarmaydi — istalgan payt qaytishingiz mumkin.";
      if (edit) await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: roleKeyboard(o.activeRole) });
      else await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: roleKeyboard(o.activeRole) });
    } catch (err) {
      await ctx.reply(`⚠️ ${apiErrorText(err, 'Rolni almashtirib bo‘lmadi')}`);
    }
  }

  async function apply(ctx: Context, role: string, orgId?: string) {
    const tid = String(ctx.from?.id);
    const info = await api.switchRole(tid, role, orgId);
    await ctx.answerCallbackQuery({ text: `Rol: ${ROLE_LABEL[role] ?? role}` }).catch(() => undefined);
    await ctx.editMessageText(`✅ Endi siz *${ROLE_LABEL[info.role] ?? info.role}* sifatida ishlayapsiz.\n\nMini App'ni yopib, qayta oching — yangi rol bilan ochiladi.`, {
      parse_mode: 'Markdown',
    });
    await ctx.reply('Menyu yangilandi 👇', { reply_markup: getMenuForRole(info.role, info.realRole) });
  }

  bot.hears(MENU_LABELS.SWITCH_ROLE, async (ctx) => {
    await showRoles(ctx);
  });

  // sr:<ROLE> — rol tanlandi
  bot.callbackQuery(/^sr:(STUDENT|TEACHER|ADMIN|SUPER_ADMIN)$/, async (ctx) => {
    const role = ctx.match[1];
    const tid = String(ctx.from?.id);
    try {
      if (!NEEDS_ORG.has(role)) return await apply(ctx, role);
      const o = await api.getSwitchOptions(tid);
      if (o.orgs.length === 0) {
        await ctx.answerCallbackQuery({ text: 'Faol maktab topilmadi', show_alert: true });
        return;
      }
      if (o.orgs.length === 1) return await apply(ctx, role, o.orgs[0].id);
      const kb = new InlineKeyboard();
      for (const org of o.orgs) kb.text(`${org.id === o.organizationId ? '✅ ' : ''}${org.name}`.slice(0, 60), `so:${role}:${org.id}`).row();
      kb.text('⬅️ Orqaga', 'sr:back');
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(`🏫 *${ROLE_LABEL[role]}* — qaysi maktab doirasida ishlaysiz?`, { parse_mode: 'Markdown', reply_markup: kb });
    } catch (err) {
      await ctx.answerCallbackQuery({ text: apiErrorText(err, 'Xatolik'), show_alert: true }).catch(() => undefined);
    }
  });

  // so:<ROLE>:<orgId> — maktab tanlandi
  bot.callbackQuery(/^so:(STUDENT|TEACHER|ADMIN):([A-Za-z0-9]+)$/, async (ctx) => {
    try {
      await apply(ctx, ctx.match[1], ctx.match[2]);
    } catch (err) {
      await ctx.answerCallbackQuery({ text: apiErrorText(err, 'Xatolik'), show_alert: true }).catch(() => undefined);
    }
  });

  bot.callbackQuery('sr:back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showRoles(ctx, true);
  });
}
