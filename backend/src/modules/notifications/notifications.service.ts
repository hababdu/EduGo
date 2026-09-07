import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

type NotificationType =
  | 'TEST_ASSIGNED'
  | 'TEST_RESULT'
  | 'RANKING_CHANGE'
  | 'DEADLINE_REMINDER'
  | 'NEW_LESSON'
  | 'ANNOUNCEMENT'
  | 'SYSTEM';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly botToken: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('BOT_TOKEN');
  }

  /** 50-band — bitta userga bildirishnoma (DB + Telegram) */
  async notify(userId: string, type: NotificationType, title: string, body: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body },
    });

    const sent = await this.sendViaTelegram(userId, title, body);
    if (sent) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentViaTelegram: true },
      });
    }

    return notification;
  }

  /** Bir nechta userga (masalan guruhga test biriktirilganda) */
  async notifyMany(userIds: string[], type: NotificationType, title: string, body: string) {
    await Promise.all(userIds.map((id) => this.notify(id, type, title, body)));
  }

  listForUser(userId: string, limit = 30) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  /**
   * Telegram Bot API'ga to'g'ridan-to'g'ri so'rov — bot serviciga bog'liq
   * emas (backend BOT_TOKEN'ni allaqachon initData tekshirish uchun ham ishlatadi).
   * Xatolik "best-effort" — bildirishnoma DB'da baribir qoladi, faqat
   * sentViaTelegram=false bo'lib qoladi.
   */
  private async sendViaTelegram(userId: string, title: string, body: string): Promise<boolean> {
    if (!this.botToken) return false;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegramId,
          text: `*${title}*\n\n${body}`,
          parse_mode: 'Markdown',
        }),
      });
      return res.ok;
    } catch (err) {
      this.logger.warn(`Telegram xabar yuborilmadi (userId=${userId}): ${(err as Error).message}`);
      return false;
    }
  }
}
