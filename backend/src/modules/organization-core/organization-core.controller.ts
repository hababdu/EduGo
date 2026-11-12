import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { OrganizationCoreService } from './organization-core.service';

class ClassifyOrganizationDto {
  @IsString() @MinLength(5) @MaxLength(40) typeId!: string;
  @IsArray() @IsString({ each: true }) directionIds!: string[];
}
class CatalogDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(2) @MaxLength(80) slug!: string;
  @IsString() @MinLength(2) @MaxLength(120) nameUz!: string;
  @IsOptional() @IsString() nameRu?: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class BranchDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() isMain?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class ActiveOrganizationDto {
  @IsString() @MinLength(5) @MaxLength(40) organizationId!: string;
}

@Public()
@Controller('api/v1/education-catalog')
export class OrganizationCoreController {
  constructor(private readonly service: OrganizationCoreService) {}
  @Get('organization-types') types() { return this.service.listTypes(); }
  @Get('directions') directions(@Query('category') category?: string) { return this.service.listDirections(category); }
}

@Roles('SUPER_ADMIN')
@Controller('api/v1/super')
export class SuperOrganizationCoreController {
  constructor(private readonly service: OrganizationCoreService) {}
  @Patch('organizations/:id/classification')
  classify(@Param('id') id: string, @Body() dto: ClassifyOrganizationDto) { return this.service.classifyOrganization(id, dto.typeId, dto.directionIds); }
  @Get('organization-types') allTypes() { return this.service.listTypesAdmin(); }
  @Get('education-directions') allDirections() { return this.service.listDirectionsAdmin(); }
  @Post('organization-types')
  saveType(@Body() dto: CatalogDto) { return this.service.manageCatalog('type', dto); }
  @Patch('organization-types/:id')
  updateType(@Param('id') id: string, @Body() dto: CatalogDto) { return this.service.manageCatalog('type', { ...dto, id }); }
  @Delete('organization-types/:id')
  deleteType(@Param('id') id: string) { return this.service.deleteCatalog('type', id); }
  @Post('education-directions')
  saveDirection(@Body() dto: CatalogDto) { return this.service.manageCatalog('direction', dto); }
  @Patch('education-directions/:id')
  updateDirection(@Param('id') id: string, @Body() dto: CatalogDto) { return this.service.manageCatalog('direction', { ...dto, id }); }
  @Delete('education-directions/:id')
  deleteDirection(@Param('id') id: string) { return this.service.deleteCatalog('direction', id); }
}

@Roles('ADMIN')
@Controller('api/v1/organization/branches')
export class OrganizationBranchController {
  constructor(private readonly service: OrganizationCoreService) {}
  @Get() list(@CurrentUser() user: CurrentUserPayload, @Query('organizationId') organizationId?: string) { return this.service.listBranches(user, organizationId); }
  @Post() create(@CurrentUser() user: CurrentUserPayload, @Body() dto: BranchDto) { return this.service.createBranch(user, dto.organizationId, dto); }
  @Patch(':id') update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: BranchDto) {
    const { organizationId: _ignoredOrganizationId, ...input } = dto;
    return this.service.updateBranch(user, id, input);
  }
  @Delete(':id') remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) { return this.service.deleteBranch(user, id); }
}

@Controller('api/v1/organizations')
export class ActiveOrganizationController {
  constructor(private readonly service: OrganizationCoreService) {}
  @Post('active')
  setActive(@CurrentUser() user: CurrentUserPayload, @Body() dto: ActiveOrganizationDto) {
    return this.service.setActiveOrganization(user.id, dto.organizationId);
  }
}
