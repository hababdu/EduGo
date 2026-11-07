import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto, ProfileDto, ReviewDto } from './dto/catalog.dto';

@Controller('api/v1/catalog')
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}
  @Get() list(@Query() q: CatalogQueryDto) { return this.svc.list(q); }
  @Get('cities') cities() { return this.svc.cities(); }
  @Get(':id') detail(@Param('id') id: string) { return this.svc.detail(id); }
  @Post(':id/reviews') review(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: ReviewDto) { return this.svc.review(u, id, dto.rating, dto.comment); }
}

@Roles('ADMIN')
@Controller('api/v1/admin/school-profile')
export class SchoolProfileController {
  constructor(private readonly svc: CatalogService) {}
  @Patch() update(@CurrentUser() u: CurrentUserPayload, @Body() dto: ProfileDto) { return this.svc.updateProfile(u, dto); }
}
