import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Autentifikatsiya talab qilinmaydigan endpointlar uchun:
 *   @Public()
 *   @Post('telegram')
 *   telegramLogin() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
