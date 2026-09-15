import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { AdminModule } from '../admin/admin.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [
    GroupsModule,   // GroupsService uchun
    AdminModule,    // AuditService uchun
  ],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}