import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsArray, IsBoolean, IsDateString, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DynamicEducationService, EDUCATION_MODELS } from './dynamic-education.service';

class ModuleConfigDto {
  @IsString() @IsIn(['GROUPS','COURSES','SUBJECTS','SCHEDULE','ACADEMIC_PERIODS','ATTENDANCE','LESSONS','MATERIALS','ASSIGNMENTS','GRADING','TESTS','PAYMENTS','CERTIFICATES','ANALYTICS','PARENT_ACCESS','TRIAL_LESSONS'])
  featureKey!: string;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}
class PolicyConfigDto {
  @IsString() @IsIn(['SCHEDULE','ATTENDANCE','GRADING','PAYMENT','ASSIGNMENT']) policyKey!: string;
  @IsObject() config!: Record<string, unknown>;
}
class SaveEducationConfigDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string;
  @IsString() @IsIn(EDUCATION_MODELS.map((m) => m.key)) modelKey!: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ModuleConfigDto) modules?: ModuleConfigDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PolicyConfigDto) policies?: PolicyConfigDto[];
}
class PeriodDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(40) periodType?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}
class UpdatePeriodDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(40) periodType?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/v1/organization/education')
export class DynamicEducationController {
  constructor(private readonly service: DynamicEducationService) {}

  @Get('catalog')
  catalog() { return this.service.catalog(); }

  @Get('config')
  getConfig(@CurrentUser() user: CurrentUserPayload, @Query('organizationId') organizationId?: string) {
    return this.service.getConfig(user, organizationId);
  }

  @Patch('config')
  saveConfig(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveEducationConfigDto) {
    return this.service.saveConfig(user, dto);
  }

  @Post('periods')
  createPeriod(@CurrentUser() user: CurrentUserPayload, @Body() dto: PeriodDto) {
    return this.service.createPeriod(user, dto);
  }

  @Patch('periods/:id')
  updatePeriod(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.service.updatePeriod(user, id, dto);
  }

  @Delete('periods/:id')
  deletePeriod(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Query('organizationId') organizationId?: string) {
    return this.service.deletePeriod(user, id, organizationId);
  }
}
