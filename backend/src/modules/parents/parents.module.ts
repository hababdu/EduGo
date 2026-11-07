import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MaterialsModule } from '../materials/materials.module';
import { ParentController, AdminParentsController, ParentInviteController } from './parents.controller';
import { ParentsService } from './parents.service';

@Module({
  imports: [DashboardModule, MaterialsModule],
  controllers: [ParentInviteController, ParentController, AdminParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
