import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { isTelegramUrl } from './TelegramLinkButton';
import { GroupSchedule } from '../../hooks/useSchedule';
import { ScheduleFields, ScheduleValue, scheduleBody, toScheduleValue, validateSchedule } from './ScheduleFields';

interface Props {
  groupId: string;
  maxCapacity?: number | null;
  telegramChatUrl?: string | null;
  memberCount: number;
  schedule?: GroupSchedule;
}

/** Guruh dars jadvali, sig'imi va Telegram havolasini tahrirlash (o'qituvchi — o'z guruhi, admin — hammasi) */
export function GroupSettingsForm({ groupId, maxCapacity, telegramChatUrl, memberCount, schedule = {} }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cap, setCap] = useState(maxCapacity ? String(maxCapacity) : '');
  const [url, setUrl] = useState(telegramChatUrl ?? '');
  const [sched, setSched] = useState<ScheduleValue>(toScheduleValue(schedule));
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/v1/groups/${groupId}`, { method: 'PATCH', data: body }),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ['teacher'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const submit = () => {
    setDone(false);
    const capNum = cap.trim() === '' ? null : Number(cap);
    if (capNum !== null && (!Number.isInteger(capNum) || capNum < 1 || capNum > 500)) {
      return setLocalErr("Sig'im 1 dan 500 gacha butun son bo'lsin (bo'sh — cheklanmagan)");
    }
    if (capNum !== null && capNum < memberCount) {
      return setLocalErr(`Guruhda hozir ${memberCount} ta a'zo bor, sig'im bundan kam bo'lmasin`);
    }
    const link = url.trim();
    if (link !== '' && !isTelegramUrl(link)) {
      return setLocalErr("Havola https://t.me/... ko'rinishida bo'lsin");
    }
    const schedErr = validateSchedule(sched);
    if (schedErr) return setLocalErr(schedErr);
    setLocalErr(null);
    save.mutate({ maxCapacity: capNum, telegramChatUrl: link === '' ? null : link, ...scheduleBody(sched) });
  };

  const input =
    'w-full bg-surface/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold/50 min-h-[44px] placeholder:text-ink-muted';

  return (
    <div className="bg-surface/20 border border-white/5 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink"
      >
        <span>Guruh sozlamalari</span>
        <span className="text-ink-muted text-xs shrink-0">{open ? 'Yopish' : 'Jadval, sig\'im, Telegram'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <ScheduleFields value={sched} onChange={(v) => { setDone(false); setSched(v); }} />
          <label className="block text-xs text-ink-muted space-y-1">
            Sig'im (o'quvchilar soni)
            <input
              inputMode="numeric"
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Cheklanmagan"
              className={input}
            />
          </label>
          <label className="block text-xs text-ink-muted space-y-1">
            Telegram guruh / bot havolasi
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://t.me/guruh_nomi"
              autoCapitalize="none"
              className={input}
            />
          </label>
          {(localErr || save.error) && (
            <p className="text-xs text-coral" role="alert">
              {localErr ?? (save.error as Error).message}
            </p>
          )}
          {done && !save.isPending && <p className="text-xs text-teal">Saqlandi ✓</p>}
          <button
            type="button"
            onClick={submit}
            disabled={save.isPending}
            className="w-full rounded-xl bg-gold text-base font-semibold py-2.5 text-sm disabled:opacity-50"
          >
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      )}
    </div>
  );
}
