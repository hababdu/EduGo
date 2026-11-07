import { Module } from '@nestjs/common';
import { AdminTeachingController, TimetableController } from './teaching.controller';
import { TeachingService } from './teaching.service';

@Module({ controllers: [AdminTeachingController, TimetableController], providers: [TeachingService], exports: [TeachingService] })
export class TeachingModule {}
