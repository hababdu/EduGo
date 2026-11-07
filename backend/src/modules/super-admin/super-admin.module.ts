import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MaterialsModule } from '../materials/materials.module';
import { OrgInvoiceService } from './org-invoice.service';
import { AdminSubscriptionController, BillingWebhookController, SuperAdminController } from './super-admin.controller';
import { OrgBillingService } from './org-billing.service';
import { SchoolBackupService } from './school-backup.service';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [AiModule, MaterialsModule],
  controllers: [SuperAdminController, AdminSubscriptionController, BillingWebhookController],
  providers: [SuperAdminService, OrgBillingService, SchoolBackupService, OrgInvoiceService],
})
export class SuperAdminModule {}
