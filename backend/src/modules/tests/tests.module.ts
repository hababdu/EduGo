import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TestManagementController } from './management/test-management.controller';
import { TestManagementService } from './management/test-management.service';
import { TestSessionController } from './session/test-session.controller';
import { TestSessionService } from './session/test-session.service';

@Module({
  imports: [AdminModule, GamificationModule, NotificationsModule],
  controllers: [TestManagementController, TestSessionController],
  providers: [TestManagementService, TestSessionService],
})
export class TestsModule {}
