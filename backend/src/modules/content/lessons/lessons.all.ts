import { assertCanEditContent, assertCanSeeContent } from '../content-access';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StreakService } from '../../gamification/streak/streak.service';

export class CreateLessonDto {
  @IsString() @IsNotEmpty() topicId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
}

export class UpdateVideoProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;
}

export class CreateVideoDto {
  @IsIn(['YOUTUBE', 'TELEGRAM', 'EXTERNAL_URL', 'CLOUD_STORAGE'])
  source: 'YOUTUBE' | 'TELEGRAM' | 'EXTERNAL_URL' | 'CLOUD_STORAGE';

  @IsString() @IsNotEmpty() url: string;

  @IsOptional() @Type(() => Number) @IsInt() duration?: number;
}

export class CreateMaterialDto {
  @IsIn(['PDF', 'DOC', 'PPT', 'IMAGE', 'OTHER'])
  type: 'PDF' | 'DOC' | 'PPT' | 'IMAGE' | 'OTHER';

  @IsString() @IsNotEmpty() fileUrl: string;
  @IsString() @IsNotEmpty() title: string;
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streakService: StreakService,
  ) {}

  async findAllByTopic(topicId: string, user: CurrentUserPayload) {
    await assertCanSeeContent(this.prisma, user, 'topic', topicId);
    return this.prisma.lesson.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
      include: { videos: true, materials: true },
    });
  }

  async create(dto: CreateLessonDto, user: CurrentUserPayload) {
    await assertCanEditContent(this.prisma, user, 'topic', dto.topicId);
    return this.prisma.lesson.create({
      data: { topicId: dto.topicId, title: dto.title, order: dto.order ?? 0 },
    });
  }

  async update(id: string, dto: UpdateLessonDto, user: CurrentUserPayload) {
    const existing = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dars topilmadi');
    await assertCanEditContent(this.prisma, user, 'lesson', id);
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const existing = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dars topilmadi');
    await assertCanEditContent(this.prisma, user, 'lesson', id);
    await this.prisma.lesson.delete({ where: { id } });
  }

  /** 12-band — video biriktirish */
  async addVideo(lessonId: string, dto: CreateVideoDto, user: CurrentUserPayload) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    await assertCanEditContent(this.prisma, user, 'lesson', lessonId);
    return this.prisma.video.create({
      data: { lessonId, source: dto.source, url: dto.url, duration: dto.duration },
    });
  }

  /** 13-band — PDF/material biriktirish */
  async addMaterial(lessonId: string, dto: CreateMaterialDto, user: CurrentUserPayload) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    await assertCanEditContent(this.prisma, user, 'lesson', lessonId);
    return this.prisma.material.create({
      data: { lessonId, type: dto.type, fileUrl: dto.fileUrl, title: dto.title },
    });
  }

  /** 12-band: video progress 0/25/50/75/100 saqlanadi. 39-band: streak yangilanadi */
  async updateVideoProgress(videoId: string, percent: number, studentId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video topilmadi');

    const result = await this.prisma.videoProgress.upsert({
      where: { videoId_studentId: { videoId, studentId } },
      create: { videoId, studentId, percent },
      update: { percent },
    });

    if (percent >= 25) {
      await this.streakService.recordActivity(studentId);
    }

    return result;
  }
}

@Controller('api/v1/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  findAll(@Query('topicId') topicId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.lessonsService.findAllByTopic(topicId, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateLessonDto, @CurrentUser() user: CurrentUserPayload) {
    return this.lessonsService.create(dto, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto, @CurrentUser() user: CurrentUserPayload) {
    return this.lessonsService.update(id, dto, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.lessonsService.remove(id, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post(':lessonId/videos')
  addVideo(@Param('lessonId') lessonId: string, @Body() dto: CreateVideoDto, @CurrentUser() user: CurrentUserPayload) {
    return this.lessonsService.addVideo(lessonId, dto, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post(':lessonId/materials')
  addMaterial(@Param('lessonId') lessonId: string, @Body() dto: CreateMaterialDto, @CurrentUser() user: CurrentUserPayload) {
    return this.lessonsService.addMaterial(lessonId, dto, user);
  }

  @Patch('videos/:videoId/progress')
  updateProgress(
    @Param('videoId') videoId: string,
    @Body() dto: UpdateVideoProgressDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.lessonsService.updateVideoProgress(videoId, dto.percent, user.id);
  }
}
