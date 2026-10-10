/** SUPER_ADMIN_TELEGRAM_IDS="123,456" — super admin bo'la oladigan yagona Telegram ID'lar. */
export function superAdminIds(raw: string | undefined = process.env.SUPER_ADMIN_TELEGRAM_IDS): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d{3,20}$/.test(s));
}
