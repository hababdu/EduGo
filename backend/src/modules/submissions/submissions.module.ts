import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MaterialsModule } from '../materials/materials.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubmissionGradingService } from './submission-grading.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [MaterialsModule, AiModule, NotificationsModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionGradingService],
})
export class SubmissionsModule {}
