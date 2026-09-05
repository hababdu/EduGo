import { Module } from '@nestjs/common';
import { CoursesController } from './courses/courses.controller';
import { CoursesService } from './courses/courses.service';
import { SubjectsController } from './subjects/subjects.controller';
import { SubjectsService } from './subjects/subjects.service';
import { SectionsController, SectionsService } from './sections/sections.all';
import { TopicsController, TopicsService } from './topics/topics.all';
import { LessonsController, LessonsService } from './lessons/lessons.all';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule], // AuditService uchun
  controllers: [
    CoursesController,
    SubjectsController,
    SectionsController,
    TopicsController,
    LessonsController,
  ],
  providers: [
    CoursesService,
    SubjectsService,
    SectionsService,
    TopicsService,
    LessonsService,
  ],
})
export class ContentModule {}
