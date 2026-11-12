import { Module } from '@nestjs/common';
import { ActiveOrganizationController, OrganizationBranchController, OrganizationCoreController, SuperOrganizationCoreController } from './organization-core.controller';
import { OrganizationCoreService } from './organization-core.service';

@Module({
  controllers: [OrganizationCoreController, SuperOrganizationCoreController, OrganizationBranchController, ActiveOrganizationController],
  providers: [OrganizationCoreService],
  exports: [OrganizationCoreService],
})
export class OrganizationCoreModule {}
