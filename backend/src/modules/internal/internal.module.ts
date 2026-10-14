import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

@Module({
  imports: [AuthModule],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
