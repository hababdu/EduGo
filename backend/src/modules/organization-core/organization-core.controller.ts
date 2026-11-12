import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrganizationCoreService } from './organization-core.service';

class ClassifyOrganizationDto {
  @IsString() @MinLength(5) @MaxLength(40) typeId!: string;
  @IsArray() @IsString({ each: true }) directionIds!: string[];
}

@Public()
@Controller('api/v1/education-catalog')
export class OrganizationCoreController {
  constructor(private readonly service: OrganizationCoreService) {}

  @Get('organization-types')
  types() { return this.service.listTypes(); }

  @Get('directions')
  directions(@Query('category') category?: string) { return this.service.listDirections(category); }
}

@Roles('SUPER_ADMIN')
@Controller('api/v1/super/organizations')
export class SuperOrganizationCoreController {
  constructor(private readonly service: OrganizationCoreService) {}

  @Patch(':id/classification')
  classify(@Param('id') id: string, @Body() dto: ClassifyOrganizationDto) {
    return this.service.classifyOrganization(id, dto.typeId, dto.directionIds);
  }
}
