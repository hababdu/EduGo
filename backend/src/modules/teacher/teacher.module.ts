// src/modules/teacher/teacher.module.ts
import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { DeadlineReminderService } from './deadline-reminder.service';

@Module({
  imports: [GroupsModule, AdminModule, NotificationsModule],
  controllers: [TeacherController],
  providers: [TeacherService, DeadlineReminderService],
  exports: [TeacherService],
})
export class TeacherModule {}