import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { TestManagementController } from './management/test-management.controller';
import { TestManagementService } from './management/test-management.service';
import { TestSessionController } from './session/test-session.controller';
import { TestSessionService } from './session/test-session.service';

@Module({
  imports: [AdminModule], // AuditService uchun
  controllers: [TestManagementController, TestSessionController],
  providers: [TestManagementService, TestSessionService],
})
export class TestsModule {}
