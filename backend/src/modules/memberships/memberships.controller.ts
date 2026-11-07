import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { RequestMembershipDto } from './dto/request-membership.dto';
import { MembershipsService } from './memberships.service';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get('me')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.memberships.listMine(user.id);
  }

  @Post('requests')
  request(@CurrentUser() user: CurrentUserPayload, @Body() dto: RequestMembershipDto) {
    return this.memberships.requestToJoin(user.id, dto.organizationId, dto.role as any);
  }

  @Post('requests/:membershipId/approve')
  approve(@CurrentUser() user: CurrentUserPayload, @Param('membershipId') membershipId: string) {
    return this.memberships.approveRequest(user.id, membershipId);
  }

  @Post('organizations/:organizationId/admins')
  appointAdmin(@CurrentUser() user: CurrentUserPayload, @Param('organizationId') organizationId: string, @Body() dto: AssignMembershipDto) {
    if (dto.role !== 'ADMIN') throw new ForbiddenException('Bu endpoint faqat ADMIN tayinlaydi');
    return this.memberships.appointSchoolAdmin(user.id, organizationId, dto.userId);
  }

  @Post('organizations/:organizationId/teachers')
  appointTeacher(@CurrentUser() user: CurrentUserPayload, @Param('organizationId') organizationId: string, @Body() dto: AssignMembershipDto) {
    if (dto.role !== 'TEACHER') throw new ForbiddenException('Bu endpoint faqat TEACHER tayinlaydi');
    return this.memberships.appointTeacher(user.id, organizationId, dto.userId);
  }
}
