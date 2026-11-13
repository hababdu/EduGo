import { Module } from '@nestjs/common';
import { ActiveOrganizationController, OrganizationBranchController, OrganizationCoreController, SuperOrganizationCoreController } from './organization-core.controller';
import { OrganizationCoreService } from './organization-core.service';
import { DynamicEducationController } from './dynamic-education.controller';
import { DynamicEducationService } from './dynamic-education.service';

@Module({
  controllers: [OrganizationCoreController, SuperOrganizationCoreController, OrganizationBranchController, ActiveOrganizationController, DynamicEducationController],
  providers: [OrganizationCoreService, DynamicEducationService],
  exports: [OrganizationCoreService],
})
export class OrganizationCoreModule {}
