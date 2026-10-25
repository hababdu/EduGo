import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ParentScopeGuard } from './common/guards/parent-scope.guard';
import { SuperReadOnlyGuard } from './common/guards/super-readonly.guard';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { GroupsModule } from './modules/groups/groups.module';
import { UsersModule } from './modules/users/users.module';
import { InternalModule } from './modules/internal/internal.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { ContentModule } from './modules/content/content.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { TestsModule } from './modules/tests/tests.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssignmentsModule } from './modules/content/assignments/assignments.module'; // <-- 1. IMPORT QILISH
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UploadModule } from './modules/upload/upload.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { AiModule } from './modules/ai/ai.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { ParentsModule } from './modules/parents/parents.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
@Module({
  imports: [
    UploadModule,
    MaterialsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    GroupsModule,
    UsersModule,
    InternalModule,
    DashboardModule,
    AdminModule,
    TeacherModule,
    ContentModule,
    QuestionsModule,
    NotificationsModule,
    AnalyticsModule,
    GamificationModule,
    TestsModule,
    RankingModule,
    AssignmentsModule, // <-- 2. IMPORTS MASSIVIGA QO'SHISH
    AiModule,
    SuperAdminModule,
    ParentsModule,
    CertificatesModule,
    SubmissionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SuperReadOnlyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ParentScopeGuard,
    },
  ],
})
export class AppModule {}