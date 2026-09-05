import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto, RefreshTokenDto } from './dto/telegram-auth.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Telegram Mini App ochilganda frontend shu endpointga initData yuboradi.
   * Login/parol yo'q — Telegram o'zi foydalanuvchini tasdiqlaydi.
   * @Public() — global JwtAuthGuard bu endpointni chetlab o'tadi
   * (chunki hali token yo'q, token aynan shu yerda beriladi).
   */
  @Public()
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async telegramLogin(@Body() dto: TelegramAuthDto) {
    return this.authService.loginWithTelegram(dto.initData);
  }

  @Public()
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
}
