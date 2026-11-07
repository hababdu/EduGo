import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParentsService } from './parents.service';

/** Taklif yaratish: o'quvchi (o'zi uchun), o'qituvchi, admin. */
@Controller('api/v1/parents')
export class ParentInviteController {
  constructor(private readonly parents: ParentsService) {}

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Post('invite')
  invite(@CurrentUser() u: CurrentUserPayload, @Body() body: { studentId?: string }) {
    return this.parents.createInvite(u, body?.studentId);
  }
}

/** Ota-ona paneli (faqat PARENT). */
@Roles('PARENT')
@Controller('api/v1/parent')
export class ParentController {
  constructor(private readonly parents: ParentsService) {}

  @Get('children')
  children(@CurrentUser() u: CurrentUserPayload) {
    return this.parents.children(u.id);
  }

  @Get('children/:id')
  child(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.parents.childDetail(u.id, id);
  }

  @Delete('children/:id')
  unlink(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.parents.unlink(u.id, id);
  }
}

/** Maktab admini: ota-ona va farzandni qo'lda bog'lash */
@Roles('ADMIN')
@Controller('api/v1/admin/parents')
export class AdminParentsController {
  constructor(private readonly parents: ParentsService) {}
  @Get('links') links(@CurrentUser() u: CurrentUserPayload) { return this.parents.adminLinks(u); }
  @Post('links') link(@CurrentUser() u: CurrentUserPayload, @Body() b: { parentId: string; studentId: string }) { return this.parents.adminLink(u, String(b?.parentId ?? ''), String(b?.studentId ?? '')); }
  @Post('links/remove') unlink(@CurrentUser() u: CurrentUserPayload, @Body() b: { parentId: string; studentId: string }) { return this.parents.adminUnlink(u, String(b?.parentId ?? ''), String(b?.studentId ?? '')); }
}
