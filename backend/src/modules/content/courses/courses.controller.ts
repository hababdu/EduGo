import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'; // Loyihangizdagi Auth Guard yo'liga qarab o'zgartiring
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@Controller('tests') // Frontend /api/v1/tests ga so'rov yuborayotgani uchun yo'l 'tests' qilib belgilanadi
@UseGuards(JwtAuthGuard) // Barcha so'rovlar avtorizatsiyadan o'tishi shart (401 xatosining oldini oladi)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.coursesService.findAllFor(user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.coursesService.findOneFor(id, user);
  }

  @Post()
  async create(
    @Body() createCourseDto: CreateCourseDto & { type?: string; category?: string; mediaUrl?: string; groupId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // user.sub yoki user.id aktor (foydalanuvchi) ID si hisoblanadi
    const actorId = user.id || user['sub'];
    return this.coursesService.create(createCourseDto, actorId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto & { type?: string; category?: string; mediaUrl?: string; groupId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const actorId = user.id || user['sub'];
    return this.coursesService.update(id, updateCourseDto, actorId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const actorId = user.id || user['sub'];
    return this.coursesService.remove(id, actorId);
  }
}