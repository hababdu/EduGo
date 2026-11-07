import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SchoolQueryDto } from './dto/school-query.dto';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Public() @Get()
  list(@Query() query: SchoolQueryDto) { return this.schools.listPublic(query); }

  @Public() @Get(':slugOrId')
  get(@Param('slugOrId') slugOrId: string) { return this.schools.getPublic(slugOrId); }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateSchoolDto) { return this.schools.create(user.id, dto); }

  @Patch(':organizationId/publication')
  publish(@CurrentUser() user: CurrentUserPayload, @Param('organizationId') organizationId: string, @Body('publiclyListed') publiclyListed: boolean) {
    return this.schools.publish(user.id, organizationId, publiclyListed);
  }
}
