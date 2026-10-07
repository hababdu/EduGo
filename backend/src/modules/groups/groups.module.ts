import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ScheduleService } from './schedule.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [GroupsController, AttendanceController, PaymentsController],
  providers: [GroupsService, AttendanceService, ScheduleService, PaymentsService],
  exports: [GroupsService, AttendanceService, ScheduleService, PaymentsService],
})
export class GroupsModule {}
