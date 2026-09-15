"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestManagementController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const test_management_service_1 = require("./test-management.service");
const test_dto_1 = require("./dto/test.dto");
let TestManagementController = class TestManagementController {
    constructor(service) {
        this.service = service;
    }
    listAssigned(user) {
        return this.service.listAssignedForStudent(user.id);
    }
    list(subjectId, status, user) {
        return this.service.list(user, { subjectId, status });
    }
    getDetail(id, user) {
        return this.service.getDetail(id, user);
    }
    create(dto, user) {
        return this.service.create(dto, user.id);
    }
    publish(id, user) {
        return this.service.publish(id, user.id);
    }
    assign(id, dto, user) {
        return this.service.assign(id, dto, user.id);
    }
    reopen(id, dto, user) {
        return this.service.reopenForStudent(id, dto, user.id);
    }
};
exports.TestManagementController = TestManagementController;
__decorate([
    (0, common_1.Get)('assigned/me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "listAssigned", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('subjectId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "list", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "getDetail", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [test_dto_1.CreateTestDto, Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Patch)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "publish", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, test_dto_1.AssignTestDto, Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "assign", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.Patch)(':id/reopen'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, test_dto_1.ReopenTestDto, Object]),
    __metadata("design:returntype", void 0)
], TestManagementController.prototype, "reopen", null);
exports.TestManagementController = TestManagementController = __decorate([
    (0, common_1.Controller)('api/v1/tests'),
    __metadata("design:paramtypes", [test_management_service_1.TestManagementService])
], TestManagementController);
//# sourceMappingURL=test-management.controller.js.map