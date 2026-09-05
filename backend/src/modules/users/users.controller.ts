import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Har doim TOKEN'dagi id orqali — bu eng xavfsiz "o'zim" endpointi */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfileFor(user.id, user);
  }

  /**
   * :id URL orqali kelgan — SHUNING UCHUN ownership tekshiruvi majburiy.
   * Masalan student-1 o'zining tokeni bilan /users/student-2/... so'rasa,
   * bu yerda 403 qaytadi (frontend hech qachon shu holatga yo'l qo'ymasa ham).
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.getProfileFor(id, user);
  }
}
