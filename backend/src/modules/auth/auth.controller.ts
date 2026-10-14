import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AppLoginService } from './app-login.service';
import { TelegramAuthDto, RefreshTokenDto, AppLoginPollDto } from './dto/telegram-auth.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appLogin: AppLoginService,
  ) {}

  /**
   * Telegram Mini App ochilganda frontend shu endpointga initData yuboradi.
   * Login/parol yo'q — Telegram o'zi foydalanuvchini tasdiqlaydi.
   * @Public() — global JwtAuthGuard bu endpointni chetlab o'tadi
   * (chunki hali token yo'q, token aynan shu yerda beriladi).
   * @Throttle — 62/63-band: brute-force/DoS'dan himoya, minutiga 10 urinish.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async telegramLogin(@Body() dto: TelegramAuthDto) {
    return this.authService.loginWithTelegram(dto.initData);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  /** Telegram'siz ilova (PWA/APK) uchun: bot orqali kirish kodi olish. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('app-login/start')
  @HttpCode(HttpStatus.OK)
  appLoginStart() {
    return this.appLogin.start();
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('app-login/poll')
  @HttpCode(HttpStatus.OK)
  appLoginPoll(@Body() dto: AppLoginPollDto) {
    return this.appLogin.poll(dto.id, dto.secret);
  }
}
