import { Module } from '@nestjs/common';
import { OrganizationCoreController, SuperOrganizationCoreController } from './organization-core.controller';
import { OrganizationCoreService } from './organization-core.service';

@Module({
  controllers: [OrganizationCoreController, SuperOrganizationCoreController],
  providers: [OrganizationCoreService],
  exports: [OrganizationCoreService],
})
export class OrganizationCoreModule {}
