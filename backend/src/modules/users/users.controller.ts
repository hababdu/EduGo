import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
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
   * ADMIN PANEL: Barcha foydalanuvchilar ro'yxati
   * GET /api/v1/users
   */
  @Get()
  async getAllUsers(@CurrentUser() user: CurrentUserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu amalni bajarish uchun admin huquqi talab etiladi');
    }
    return this.usersService.findAllUsers();
  }

  /**
   * ADMIN PANEL: Foydalanuvchi rolini o'zgartirish
   * PATCH /api/v1/users/:id/role
   */
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu amalni bajarish uchun admin huquqi talab etiladi');
    }
    return this.usersService.updateRole(id, role);
  }

  /**
   * :id URL orqali kelgan — SHUNING UCHUN ownership tekshiruvi majburiy.
   * Masalan student-1 o'zining tokeni bilan /users/student-2/... so'rasa,
   * bu yerda 403 qaytadi.
   * 
   * Eslatma: Parametrli route `:id` eng pastda joylashishi shart.
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.getProfileFor(id, user);
  }
}