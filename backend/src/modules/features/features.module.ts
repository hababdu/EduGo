import { Global, Module } from '@nestjs/common';
import { FeatureGuard } from './feature.guard';
import { AdminFeaturesController, SuperFeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

@Global()
@Module({
  controllers: [AdminFeaturesController, SuperFeaturesController],
  providers: [FeaturesService, FeatureGuard],
  exports: [FeaturesService, FeatureGuard],
})
export class FeaturesModule {}
