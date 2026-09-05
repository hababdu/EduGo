import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Body, Controller, Get, Injectable, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';

export class CreateLessonDto {
  @IsString() @IsNotEmpty() topicId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
}

export class UpdateVideoProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTopic(topicId: string) {
    return this.prisma.lesson.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
      include: { videos: true, materials: true },
    });
  }

  create(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: { topicId: dto.topicId, title: dto.title, order: dto.order ?? 0 },
    });
  }

  /** 12-band: video progress 0/25/50/75/100 saqlanadi */
  async updateVideoProgress(videoId: string, percent: number, studentId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video topilmadi');

    return this.prisma.videoProgress.upsert({
      where: { videoId_studentId: { videoId, studentId } },
      create: { videoId, studentId, percent },
      update: { percent },
    });
  }
}

@Controller('api/v1/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  findAll(@Query('topicId') topicId: string) {
    return this.lessonsService.findAllByTopic(topicId);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateLessonDto) {
    return this.lessonsService.create(dto);
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
