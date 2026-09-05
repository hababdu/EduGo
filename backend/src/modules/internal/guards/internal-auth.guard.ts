import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Telegram bot backend bilan foydalanuvchi tokeni orqali emas,
 * server-to-server sirli kalit orqali gaplashadi (chunki botda
 * WebApp initData yo'q — bu oddiy Telegram xabar oqimi).
 *
 * BOT_INTERNAL_SECRET faqat backend va bot orasida, ikkalasi ham
 * bir xil ishonchli tarmoqda/serverda joylashgan deb hisoblanadi.
 * Bu endpointlar HECH QACHON frontendga yoki tashqariga ochilmasin.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-internal-secret'];
    const expected = this.configService.get<string>('BOT_INTERNAL_SECRET');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Ichki so\'rov kaliti noto\'g\'ri');
    }
    return true;
  }
}
