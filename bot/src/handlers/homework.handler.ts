// src/handlers/homework.handler.ts
// O'quvchi vazifani Mini App ochmasdan, botning o'zida topshiradi: matn, rasm yoki fayl.
import fetch from 'node-fetch';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { MENU_LABELS } from '../keyboards/main-menu.keyboard';
import { api, apiErrorText, HomeworkTask } from '../services/api-client';

const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024; // Telegram Bot API getFile chegarasi
const SESSION_TTL_MS = 30 * 60 * 1000;
const BOT_TOKEN = process.env.BOT_TOKEN ?? '';

interface Draft {
  assignmentId: string;
  title: string;
  text: string[];
  files: { id: string; name: string }[];
  uploading: number;
  touchedAt: number;
}

/** Oddiy xotira: bot qayta ishga tushsa qoralama yo'qoladi (o'quvchi qaytadan boshlaydi). */
const drafts = new Map<string, Draft>();

function sweep() {
  const now = Date.now();
  for (const [k, d] of drafts) if (now - d.touchedAt > SESSION_TTL_MS) drafts.delete(k);
}
setInterval(sweep, 5 * 60 * 1000).unref();

/** Telegram HTML uchun */
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmtDue(iso: string | null): string {
  if (!iso) return 'muddat belgilanmagan';
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  return `muddat ${p.replace(',', '')}`;
}

function draftKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('✅ Yuborish', 'hwgo').text('❌ Bekor qilish', 'hwx');
}

function draftSummary(d: Draft): string {
  const t = d.text.join('\n\n');
  return (
    `📝 <b>${esc(d.title)}</b>\n\n` +
    `Matn: ${t ? `${t.length} belgi` : '—'}\n` +
    `Fayllar: ${d.files.length}/${MAX_FILES}` +
    (d.files.length ? `\n${d.files.map((f) => `• ${esc(f.name)}`).join('\n')}` : '') +
    '\n\nYana matn, rasm yoki fayl yuborishingiz mumkin. Tayyor bo‘lsa <b>✅ Yuborish</b> ni bosing.'
  );
}

async function downloadTelegramFile(ctx: Context, fileId: string): Promise<Buffer> {
  const f = await ctx.api.getFile(fileId);
  if (!f.file_path) throw new Error('Fayl yo‘li yo‘q');
  if (f.file_size && f.file_size > MAX_BYTES) throw new Error('Fayl 20 MB dan oshmasin');
  const res = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${f.file_path}`, { timeout: 60_000 });
  if (!res.ok) throw new Error('Faylni yuklab bo‘lmadi');
  const buf = await res.buffer();
  if (buf.length > MAX_BYTES) throw new Error('Fayl 20 MB dan oshmasin');
  return buf;
}

export function registerHomeworkHandlers(bot: Bot) {
  /* ---------- Ro'yxat ---------- */
  async function showList(ctx: Context, edit = false) {
    const tid = String(ctx.from?.id);
    let tasks: HomeworkTask[];
    try {
      tasks = await api.listHomework(tid);
    } catch (err) {
      await ctx.reply(`⚠️ ${apiErrorText(err, 'Vazifalarni olib bo‘lmadi')}`);
      return;
    }
    if (tasks.length === 0) {
      const t = '🎉 Hozircha topshiriladigan vazifa yo‘q.';
      if (edit) await ctx.editMessageText(t).catch(() => undefined);
      else await ctx.reply(t);
      return;
    }
    const kb = new InlineKeyboard();
    for (const t of tasks.slice(0, 20)) {
      const flag = t.state === 'RETURNED' ? '↩️ ' : t.overdue ? '⏰ ' : '';
      kb.text(`${flag}${t.title} · ${t.groupName}`.slice(0, 60), `hw:${t.id}`).row();
    }
    const text = `📝 <b>Topshiriladigan vazifalar</b> (${tasks.length})\n\nBirini tanlang:`;
    if (edit) await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }).catch(() => undefined);
    else await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }

  bot.hears(MENU_LABELS.HOMEWORK, async (ctx) => {
    await showList(ctx);
  });

  /* ---------- Vazifa tafsiloti ---------- */
  bot.callbackQuery(/^hw:([A-Za-z0-9]+)$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    try {
      const d = await api.getHomework(tid, ctx.match[1]);
      const sub = d.submission;
      let text = `📝 <b>${esc(d.assignment.title)}</b>\n${fmtDue(d.assignment.dueAt)} · maks. ball ${d.assignment.maxScore}`;
      if (sub?.status === 'RETURNED') {
        text += `\n\n↩️ <b>Tuzatishga qaytarilgan</b>${sub.returnNote ? `\n${esc(sub.returnNote)}` : ''}`;
      } else if (sub?.status === 'GRADED') {
        text += `\n\n✅ Baholangan: <b>${sub.score ?? '—'}/${sub.maxScore}</b>${sub.feedback ? `\n${esc(sub.feedback)}` : ''}`;
      } else if (sub) {
        text += '\n\n📤 Topshirilgan, tekshirilmoqda.';
      }
      if (!d.canSubmit && d.closedReason) text += `\n\n🔒 ${esc(d.closedReason)}`;
      const kb = new InlineKeyboard();
      if (d.canSubmit) kb.text(sub ? '🔁 Qayta topshirish' : '📤 Topshirish', `hws:${d.assignment.id}`).row();
      kb.text('⬅️ Ro‘yxat', 'hwl');
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
    } catch (err) {
      await ctx.answerCallbackQuery({ text: apiErrorText(err, 'Vazifa topilmadi'), show_alert: true }).catch(() => undefined);
    }
  });

  bot.callbackQuery('hwl', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showList(ctx, true);
  });

  /* ---------- Topshirishni boshlash ---------- */
  bot.callbackQuery(/^hws:([A-Za-z0-9]+)$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    try {
      const d = await api.getHomework(tid, ctx.match[1]);
      if (!d.canSubmit) {
        await ctx.answerCallbackQuery({ text: d.closedReason ?? 'Topshirib bo‘lmaydi', show_alert: true });
        return;
      }
      const old = drafts.get(tid);
      if (old) await cleanupFiles(tid, old);
      const draft: Draft = { assignmentId: d.assignment.id, title: d.assignment.title, text: [], files: [], uploading: 0, touchedAt: Date.now() };
      drafts.set(tid, draft);
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `📤 <b>${esc(d.assignment.title)}</b>\n\nJavobingizni shu chatga yuboring:\n` +
          '• matn (bir necha xabar bo‘lishi mumkin)\n' +
          `• rasm yoki fayl (PDF, DOCX, rasm…) — ${MAX_FILES} tagacha, har biri 20 MB gacha\n\n` +
          'Tayyor bo‘lgach <b>✅ Yuborish</b> ni bosing.',
        { parse_mode: 'HTML', reply_markup: draftKeyboard() },
      );
    } catch (err) {
      await ctx.answerCallbackQuery({ text: apiErrorText(err, 'Xatolik'), show_alert: true }).catch(() => undefined);
    }
  });

  /* ---------- Yuborish / bekor ---------- */
  bot.callbackQuery('hwgo', async (ctx) => {
    const tid = String(ctx.from?.id);
    const d = drafts.get(tid);
    if (!d) {
      await ctx.answerCallbackQuery({ text: 'Qoralama topilmadi. Vazifani qaytadan tanlang.', show_alert: true });
      return;
    }
    if (d.uploading > 0) {
      await ctx.answerCallbackQuery({ text: 'Fayl yuklanmoqda, bir soniya kuting…' });
      return;
    }
    const text = d.text.join('\n\n').trim();
    if (!text && d.files.length === 0) {
      await ctx.answerCallbackQuery({ text: 'Avval javob matnini yoki faylni yuboring', show_alert: true });
      return;
    }
    try {
      await api.submitHomework(tid, d.assignmentId, { textAnswer: text || undefined, fileIds: d.files.map((f) => f.id) });
      drafts.delete(tid);
      await ctx.answerCallbackQuery({ text: 'Topshirildi ✅' });
      await ctx.editMessageText(
        `✅ <b>${esc(d.title)}</b> topshirildi!\n\nNatija tayyor bo‘lgach shu yerga xabar keladi.`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      await ctx.answerCallbackQuery({ text: apiErrorText(err, 'Topshirib bo‘lmadi'), show_alert: true }).catch(() => undefined);
    }
  });

  async function cleanupFiles(tid: string, d: Draft) {
    for (const f of d.files) await api.deleteHomeworkFile(tid, f.id).catch(() => undefined);
  }

  bot.callbackQuery('hwx', async (ctx) => {
    const tid = String(ctx.from?.id);
    const d = drafts.get(tid);
    if (d) {
      drafts.delete(tid);
      await cleanupFiles(tid, d);
    }
    await ctx.answerCallbackQuery({ text: 'Bekor qilindi' });
    await ctx.editMessageText('❌ Topshirish bekor qilindi.').catch(() => undefined);
  });

  /* ---------- Javobni yig'ish: matn / rasm / fayl ---------- */
  bot.on(['message:text', 'message:photo', 'message:document'], async (ctx, next) => {
    const tid = String(ctx.from?.id);
    const d = drafts.get(tid);
    if (!d) return next(); // topshirish rejimida emas — boshqa handlerlarga
    d.touchedAt = Date.now();

    // Matn
    if (ctx.message.text !== undefined) {
      if (ctx.message.text.startsWith('/')) return next();
      d.text.push(ctx.message.text);
      await ctx.reply(draftSummary(d), { parse_mode: 'HTML', reply_markup: draftKeyboard() });
      return;
    }

    // Fayl / rasm
    if (d.files.length + d.uploading >= MAX_FILES) {
      await ctx.reply(`⚠️ Eng ko‘pi bilan ${MAX_FILES} ta fayl. Keraksiz bo‘lsa ❌ Bekor qilib, qaytadan boshlang.`, { reply_markup: draftKeyboard() });
      return;
    }
    let fileId: string;
    let name: string;
    let mime: string;
    if (ctx.message.photo) {
      const best = ctx.message.photo[ctx.message.photo.length - 1];
      fileId = best.file_id;
      name = `rasm_${d.files.length + 1}.jpg`;
      mime = 'image/jpeg';
    } else if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      name = ctx.message.document.file_name ?? `fayl_${d.files.length + 1}`;
      mime = ctx.message.document.mime_type ?? 'application/octet-stream';
      if ((ctx.message.document.file_size ?? 0) > MAX_BYTES) {
        await ctx.reply('⚠️ Fayl 20 MB dan oshmasin.', { reply_markup: draftKeyboard() });
        return;
      }
    } else {
      return next();
    }

    d.uploading++;
    try {
      const buf = await downloadTelegramFile(ctx, fileId);
      const up = await api.uploadHomeworkFile(tid, { buffer: buf, fileName: name, mimeType: mime });
      d.files.push({ id: up.id, name: up.fileName ?? name });
      await ctx.reply(draftSummary(d), { parse_mode: 'HTML', reply_markup: draftKeyboard() });
    } catch (err) {
      await ctx.reply(`⚠️ ${apiErrorText(err, (err as Error)?.message || 'Faylni yuklab bo‘lmadi')}`, { reply_markup: draftKeyboard() });
    } finally {
      d.uploading--;
    }
  });
}
