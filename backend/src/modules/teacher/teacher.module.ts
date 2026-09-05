import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [GroupsModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
