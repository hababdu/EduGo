import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  telegramId: string;
  role: string;
  status: string;
}

/**
 * Foydalanish:
 *   @Get('me')
 *   getMe(@CurrentUser() user: CurrentUserPayload) { ... }
 *
 * Bu YAGONA to'g'ri usul — controller'da hech qachon
 * @Param('userId') orqali kelgan id'ga ishonib amal bajarmang,
 * har doim shu decorator orqali kelgan (token'dan olingan) id'ni ishlating.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
