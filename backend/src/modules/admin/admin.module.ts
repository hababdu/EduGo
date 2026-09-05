import { Module } from '@nestjs/common';
import { OverviewController } from './overview/overview.controller';
import { OverviewService } from './overview/overview.service';
import { AdminStudentsController } from './students/admin-students.controller';
import { AdminStudentsService } from './students/admin-students.service';
import { AuditService } from './audit/audit.service';

@Module({
  controllers: [OverviewController, AdminStudentsController],
  providers: [OverviewService, AdminStudentsService, AuditService],
  exports: [AuditService],
})
export class AdminModule {}
