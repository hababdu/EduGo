import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Post,
  ForbiddenException,
} from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrivacyService } from './privacy.service';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly privacy: PrivacyService) {}

  /** Har doim TOKEN'dagi id orqali — bu eng xavfsiz "o'zim" endpointi */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfileFor(user.id, user);
  }

  /** O'z ma'lumotlarini yuklab olish (JSON) */
  @Get('me/export')
  exportMe(@CurrentUser() user: CurrentUserPayload) {
    return this.privacy.exportMine(user);
  }

  /** Hisobni o'chirish (anonimlashtirish). Body: { confirm: "DELETE" } */
  @Post('me/delete')
  deleteMe(@CurrentUser() user: CurrentUserPayload, @Body() body: { confirm?: string }) {
    return this.privacy.deleteMine(user, body?.confirm);
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
    return this.usersService.findAllUsers(user);
  }

  /**
   * ADMIN PANEL: Foydalanuvchi rolini o'zgartirish
   * PATCH /api/v1/users/:id/role
   */
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu amalni bajarish uchun admin huquqi talab etiladi');
    }
    return this.usersService.updateRole(id, dto.role, user);
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