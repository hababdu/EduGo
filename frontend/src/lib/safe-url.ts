/** Faqat http(s) havolalar ko'rsatiladi/ochiladi (javascript:, data: va hokazolar rad etiladi). */
export function isHttpUrl(u?: string | null): u is string {
  return !!u && /^https?:\/\/\S+$/i.test(u.trim());
}

/** YouTube havolasini embed ko'rinishiga o'tkazadi; boshqa havolalar uchun null. */
export function youtubeEmbed(u: string): string | null {
  try {
    const url = new URL(u.trim());
    const host = url.hostname.replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = url.searchParams.get('v') ?? (url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : null);
    }
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
