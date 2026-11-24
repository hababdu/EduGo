import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateFeatureDto } from './dto/features.dto';
import { FeaturesService } from './features.service';

/** ADMIN: o'z maktabi uchun do'kon */
@Roles('ADMIN')
@Controller('api/v1/admin/features')
export class AdminFeaturesController {
  constructor(private readonly svc: FeaturesService) {}
  @Get() store(@CurrentUser() u: CurrentUserPayload) { return this.svc.store(u); }
  @Post(':key/enable') enable(@CurrentUser() u: CurrentUserPayload, @Param('key') key: string) { return this.svc.enable(u, key); }
  @Delete(':key') disable(@CurrentUser() u: CurrentUserPayload, @Param('key') key: string) { return this.svc.disable(u, key); }
}

/** SUPER ADMIN: katalog va narxlar */
@Roles('SUPER_ADMIN')
@Controller('api/v1/super/features')
export class SuperFeaturesController {
  constructor(private readonly svc: FeaturesService) {}
  @Get() catalog() { return this.svc.catalog(); }
  @Patch(':key') update(@CurrentUser() u: CurrentUserPayload, @Param('key') key: string, @Body() dto: UpdateFeatureDto) { return this.svc.updateCatalog(u, key, dto); }
}
