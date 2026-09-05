import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';

@Controller('api/v1/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * Rol tekshiruvi shart emas — @Roles() qo'yilmagan,
   * chunki hamma rol (student/teacher/admin) shu endpointdan
   * foydalanadi, lekin har biri FAQAT o'ziga tegishlisini ko'radi
   * (buni GroupsService.findAllForUser hal qiladi).
   */
  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findAllForUser(user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // findOneOrThrow ichida ownership tekshiriladi — mos kelmasa 403/404
    return this.groupsService.findOneOrThrow(id, user);
  }

  /**
   * @Roles() misoli — faqat TEACHER va ADMIN kira oladi,
   * STUDENT umuman so'rov yubora olmaydi (RolesGuard darhol 403 qaytaradi,
   * hatto service'gacha yetmasdan).
   */
  @Roles('TEACHER', 'ADMIN')
  @Get(':id/students')
  async listStudents(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const group = await this.groupsService.findOneOrThrow(id, user);
    return group.members;
  }
}
