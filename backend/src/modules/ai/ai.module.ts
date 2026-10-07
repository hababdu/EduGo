// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { GamificationModule } from '../gamification/gamification.module';
import { GroupsModule } from '../groups/groups.module';
import { RankingModule } from '../ranking/ranking.module';
import { TeacherModule } from '../teacher/teacher.module';
import { TestsModule } from '../tests/tests.module';
import { AiConfig } from './ai.config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { AiAccessService } from './features/ai-access.service';
import { AiFeaturesController } from './features/ai-features.controller';
import { AiFeaturesService } from './features/ai-features.service';
import { AssistantActionService } from './assistant/assistant-action.service';
import { AssistantController } from './assistant/assistant.controller';
import { AssistantDataService } from './assistant/assistant-data.service';
import { AssistantService } from './assistant/assistant.service';
import { AssistantToolRegistry } from './assistant/assistant-tool.registry';

@Module({
  // Yordamchi tool'lari mavjud servislarni chaqiradi — ular tegishli modullardan eksport qilingan
  imports: [
    AdminModule,
    AnalyticsModule,
    DashboardModule,
    GamificationModule,
    GroupsModule,
    RankingModule,
    TeacherModule,
    TestsModule,
  ],
  controllers: [AiController, AiFeaturesController, AssistantController],
  providers: [
    AiConfig,
    AiUsageService,
    AnthropicProvider,
    GroqProvider,
    GeminiProvider,
    AiService,
    AiAccessService,
    AiFeaturesService,
    AssistantDataService,
    AssistantToolRegistry,
    AssistantActionService,
    AssistantService,
  ],
  exports: [AiService],
})
export class AiModule {}
