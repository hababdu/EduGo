import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Body, Controller, Delete, ForbiddenException, Get, Injectable, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';

export class CreateTopicDto {
  @IsString() @IsNotEmpty() sectionId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
  @IsOptional() @IsBoolean() sequentialLocked?: boolean;
}

export class UpdateTopicDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
  @IsOptional() @IsBoolean() sequentialLocked?: boolean;
  @IsOptional() @IsIn(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBySection(sectionId: string, user: CurrentUserPayload) {
    const isStudent = user.role === 'STUDENT';
    const topics = await this.prisma.topic.findMany({
      where: { sectionId, deletedAt: null, ...(isStudent ? { status: 'PUBLISHED' } : {}) },
      orderBy: { order: 'asc' },
    });

    if (!isStudent) return topics;

    // 14-band: SEQUENTIAL LEARNING — oldingi topic tugamaguncha keyingisi qulflangan
    return this.withLockStatus(topics, user.id);
  }

  /**
   * Har bir topic uchun "isLocked" belgisini hisoblaydi: agar shu topic
   * sequentialLocked=true bo'lsa va undan oldingi (order bo'yicha) topic
   * hali "tugatilmagan" bo'lsa (hozircha oddiy mezon: unga tegishli testdan
   * o'tilmagan), u qulflangan hisoblanadi.
   */
  private async withLockStatus(topics: any[], studentId: string) {
    const sorted = [...topics].sort((a, b) => a.order - b.order);
    const result: any[] = [];
    let previousCompleted = true;

    for (const topic of sorted) {
      const isLocked = topic.sequentialLocked && !previousCompleted;
      result.push({ ...topic, isLocked });

      if (topic.sequentialLocked) {
        const attempt = await this.prisma.testAttempt.findFirst({
          where: { studentId, test: { topicId: topic.id }, passed: true },
        });
        previousCompleted = !!attempt;
      }
    }

    return result;
  }

  async findOneFor(id: string, user: CurrentUserPayload) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic || topic.deletedAt) throw new NotFoundException('Mavzu topilmadi');
    if (user.role === 'STUDENT') {
      if (topic.status !== 'PUBLISHED') throw new NotFoundException('Mavzu topilmadi');

      const [locked] = await this.withLockStatus([topic], user.id);
      if (locked.isLocked) {
        throw new ForbiddenException(
          'Bu mavzuni ochish uchun avval oldingi mavzuni yakunlang',
        );
      }
    }
    return topic;
  }

  create(dto: CreateTopicDto) {
    return this.prisma.topic.create({
      data: {
        sectionId: dto.sectionId,
        title: dto.title,
        description: dto.description,
        posterUrl: dto.posterUrl,
        order: dto.order ?? 0,
        sequentialLocked: dto.sequentialLocked ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateTopicDto) {
    const existing = await this.prisma.topic.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Mavzu topilmadi');
    return this.prisma.topic.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.topic.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Mavzu topilmadi');
    await this.prisma.topic.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

@Controller('api/v1/topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  findAll(@Query('sectionId') sectionId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.topicsService.findAllBySection(sectionId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.topicsService.findOneFor(id, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.create(dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.topicsService.update(id, dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}
