import { Module } from '@nestjs/common';
import { OrganizationCoreController } from './organization-core.controller';
import { OrganizationCoreService } from './organization-core.service';

@Module({
  controllers: [OrganizationCoreController],
  providers: [OrganizationCoreService],
  exports: [OrganizationCoreService],
})
export class OrganizationCoreModule {}
