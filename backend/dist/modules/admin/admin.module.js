"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const overview_controller_1 = require("./overview/overview.controller");
const overview_service_1 = require("./overview/overview.service");
const admin_students_controller_1 = require("./students/admin-students.controller");
const admin_students_service_1 = require("./students/admin-students.service");
const audit_service_1 = require("./audit/audit.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [overview_controller_1.OverviewController, admin_students_controller_1.AdminStudentsController],
        providers: [overview_service_1.OverviewService, admin_students_service_1.AdminStudentsService, audit_service_1.AuditService],
        exports: [audit_service_1.AuditService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map