import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [GroupsController, AttendanceController],
  providers: [GroupsService, AttendanceService],
  exports: [GroupsService, AttendanceService],
})
export class GroupsModule {}
