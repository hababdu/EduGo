"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const groups_module_1 = require("./modules/groups/groups.module");
const users_module_1 = require("./modules/users/users.module");
const internal_module_1 = require("./modules/internal/internal.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const admin_module_1 = require("./modules/admin/admin.module");
const teacher_module_1 = require("./modules/teacher/teacher.module");
const content_module_1 = require("./modules/content/content.module");
const questions_module_1 = require("./modules/questions/questions.module");
const tests_module_1 = require("./modules/tests/tests.module");
const ranking_module_1 = require("./modules/ranking/ranking.module");
const gamification_module_1 = require("./modules/gamification/gamification.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const assignments_module_1 = require("./modules/content/assignments/assignments.module");
const jwt_auth_guard_1 = require("./modules/auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            event_emitter_1.EventEmitterModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            groups_module_1.GroupsModule,
            users_module_1.UsersModule,
            internal_module_1.InternalModule,
            dashboard_module_1.DashboardModule,
            admin_module_1.AdminModule,
            teacher_module_1.TeacherModule,
            content_module_1.ContentModule,
            questions_module_1.QuestionsModule,
            notifications_module_1.NotificationsModule,
            analytics_module_1.AnalyticsModule,
            gamification_module_1.GamificationModule,
            tests_module_1.TestsModule,
            ranking_module_1.RankingModule,
            assignments_module_1.AssignmentsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map