import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [GroupsController, AttendanceController],
  providers: [GroupsService, AttendanceService, ScheduleService],
  exports: [GroupsService, AttendanceService, ScheduleService],
})
export class GroupsModule {}
