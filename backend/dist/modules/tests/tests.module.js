"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestsModule = void 0;
const common_1 = require("@nestjs/common");
const admin_module_1 = require("../admin/admin.module");
const gamification_module_1 = require("../gamification/gamification.module");
const notifications_module_1 = require("../notifications/notifications.module");
const test_management_controller_1 = require("./management/test-management.controller");
const test_management_service_1 = require("./management/test-management.service");
const test_session_controller_1 = require("./session/test-session.controller");
const test_session_service_1 = require("./session/test-session.service");
let TestsModule = class TestsModule {
};
exports.TestsModule = TestsModule;
exports.TestsModule = TestsModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_module_1.AdminModule, gamification_module_1.GamificationModule, notifications_module_1.NotificationsModule],
        controllers: [test_management_controller_1.TestManagementController, test_session_controller_1.TestSessionController],
        providers: [test_management_service_1.TestManagementService, test_session_service_1.TestSessionService],
    })
], TestsModule);
//# sourceMappingURL=tests.module.js.map