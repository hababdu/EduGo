import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

@Controller('api/v1/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /** Rol cheklovi yo'q — har bir rol o'ziga tegishlisini ko'radi (service ichida filtrlanadi) */
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.coursesService.findAllFor(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.coursesService.findOneFor(id, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: CurrentUserPayload) {
    return this.coursesService.create(dto, user.id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.coursesService.update(id, dto, user.id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.coursesService.remove(id, user.id);
  }
}
