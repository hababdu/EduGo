import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DynamicEducationService } from './dynamic-education.service';

@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
@Controller('api/v1/organization/education')
export class EducationFeaturesController {
  constructor(private readonly service: DynamicEducationService) {}

  @Get('enabled-features')
  enabled(@CurrentUser() user: CurrentUserPayload) {
    return this.service.enabledFeatures(user);
  }
}
