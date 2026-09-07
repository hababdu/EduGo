import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { RankingGateway } from './ranking.gateway';

@Module({
  imports: [AuthModule], // JwtService uchun (gateway'da token tekshirish)
  controllers: [RankingController],
  providers: [RankingService, RankingGateway],
  exports: [RankingService],
})
export class RankingModule {}
