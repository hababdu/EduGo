import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/organization-permissions.decorator';
import { AttachDto, DecideDto, JoinRequestDto, MemberPermissionsDto, MemberRoleDto, MembersQueryDto, SchoolSearchDto } from './dto/memberships.dto';
import { MembershipsService } from './memberships.service';

/** Foydalanuvchi: maktabsiz ro'yxatdan o'tgan, maktabga qo'shilish so'rovi yuboradi. */
@Controller('api/v1/memberships')
export class MembershipsController {
  constructor(private readonly svc: MembershipsService) {}

  @Get('schools') schools(@Query() q: SchoolSearchDto) { return this.svc.schools(q.search); }
  @Get('mine') mine(@CurrentUser() u: CurrentUserPayload) { return this.svc.mine(u); }
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('requests') request(@CurrentUser() u: CurrentUserPayload, @Body() dto: JoinRequestDto) { return this.svc.requestJoin(u, dto.organizationId, dto.role, dto.message); }
  @Post(':id/activate') activate(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.activate(u, id); }
  @Delete('requests/:id') cancel(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.cancel(u, id); }
}

/** Maktab admini (o'z maktabi) va SUPER_ADMIN (RolesGuard uni har doim o'tkazadi). */
@Roles('ADMIN')
@Controller('api/v1/admin/memberships')
export class AdminMembershipsController {
  constructor(private readonly svc: MembershipsService) {}

  @Get() list(@CurrentUser() u: CurrentUserPayload, @Query() q: MembersQueryDto) { return this.svc.list(u, q); }
  @Post('attach') attach(@CurrentUser() u: CurrentUserPayload, @Body() dto: AttachDto) { return this.svc.attach(u, dto.userId, dto.role, dto.organizationId); }
  @Post(':id/approve') approve(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: DecideDto) { return this.svc.decide(u, id, true, dto.role); }
  @Post(':id/reject') reject(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.decide(u, id, false); }
  @Patch(':id/role') role(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: MemberRoleDto) { return this.svc.changeRole(u, id, dto.role); }
  @RequirePermissions('memberships.permissions.manage')
  @Patch(':id/permissions') permissions(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: MemberPermissionsDto) {
    return this.svc.updatePermissions(u, id, dto.allow ?? [], dto.deny ?? []);
  }
  @Delete(':id') remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.remove(u, id); }
}
