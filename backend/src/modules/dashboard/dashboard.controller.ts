// src/modules/dashboard/dashboard.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Student dashboard — har doim TOKEN'dagi userId */
  @Get('me')
  async getMyDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getStudentDashboard(user.id);
  }

  /** Barcha materiallar — student a'zo bo'lgan guruhlarga tegishli */
  @Get('assignments')
  async getMyAssignments(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.listMyAssignments(user.id);
  }

  /** Bitta material — student a'zo ekanini tekshiradi */
  @Get('assignments/:id')
  async getMyAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.dashboardService.getMyAssignment(user.id, id);
  }
}