import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeatureGuard } from '../features/feature.guard';
import { RequireFeature } from '../features/feature.guard';
import { CreateLeadDto, UpdateLeadDto } from './dto/leads.dto';
import { LeadsService } from './leads.service';

@UseGuards(FeatureGuard) @RequireFeature('leads')
@Roles('ADMIN')
@Controller('api/v1/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get() list(@CurrentUser() u: CurrentUserPayload, @Query('status') status?: string) { return this.leads.list(u, status); }
  @Post() create(@CurrentUser() u: CurrentUserPayload, @Body() dto: CreateLeadDto) { return this.leads.create(u, dto); }
  @Patch(':id') update(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateLeadDto) { return this.leads.update(u, id, dto); }
  @Delete(':id') remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.leads.remove(u, id); }
}
