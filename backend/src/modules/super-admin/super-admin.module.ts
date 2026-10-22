import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MaterialsModule } from '../materials/materials.module';
import { AdminSubscriptionController, SuperAdminController } from './super-admin.controller';
import { OrgBillingService } from './org-billing.service';
import { SchoolBackupService } from './school-backup.service';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [AiModule, MaterialsModule],
  controllers: [SuperAdminController, AdminSubscriptionController],
  providers: [SuperAdminService, OrgBillingService, SchoolBackupService],
})
export class SuperAdminModule {}
