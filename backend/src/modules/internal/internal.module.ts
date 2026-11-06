import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MaterialsModule } from '../materials/materials.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ParentsModule } from '../parents/parents.module';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

@Module({
  imports: [AuthModule, ParentsModule, DashboardModule, MaterialsModule, SubmissionsModule],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
