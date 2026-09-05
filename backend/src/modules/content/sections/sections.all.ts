import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';

export class CreateSectionDto {
  @IsString() @IsNotEmpty() subjectId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
}

export class UpdateSectionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() order?: number;
  @IsOptional() @IsIn(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllBySubject(subjectId: string, user: CurrentUserPayload) {
    const isStudent = user.role === 'STUDENT';
    return this.prisma.section.findMany({
      where: { subjectId, deletedAt: null, ...(isStudent ? { status: 'PUBLISHED' } : {}) },
      orderBy: { order: 'asc' },
    });
  }

  async findOneFor(id: string, user: CurrentUserPayload) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section || section.deletedAt) throw new NotFoundException('Bo\'lim topilmadi');
    if (user.role === 'STUDENT' && section.status !== 'PUBLISHED') {
      throw new NotFoundException('Bo\'lim topilmadi');
    }
    return section;
  }

  create(dto: CreateSectionDto) {
    return this.prisma.section.create({
      data: {
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        posterUrl: dto.posterUrl,
        order: dto.order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.section.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Bo\'lim topilmadi');
    return this.prisma.section.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.section.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Bo\'lim topilmadi');
    await this.prisma.section.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

@Controller('api/v1/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  findAll(@Query('subjectId') subjectId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.sectionsService.findAllBySubject(subjectId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.sectionsService.findOneFor(id, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateSectionDto) {
    return this.sectionsService.create(dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.sectionsService.update(id, dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sectionsService.remove(id);
  }
}
