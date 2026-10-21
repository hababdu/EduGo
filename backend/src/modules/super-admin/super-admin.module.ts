import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MaterialsModule } from '../materials/materials.module';
import { AdminSubscriptionController, SuperAdminController } from './super-admin.controller';
import { OrgBillingService } from './org-billing.service';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [AiModule, MaterialsModule],
  controllers: [SuperAdminController, AdminSubscriptionController],
  providers: [SuperAdminService, OrgBillingService],
})
export class SuperAdminModule {}
