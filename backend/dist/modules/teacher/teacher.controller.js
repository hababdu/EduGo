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
exports.TeacherController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const teacher_service_1 = require("./teacher.service");
const teacher_assignments_dto_1 = require("./dto/teacher-assignments.dto");
let TeacherController = class TeacherController {
    constructor(teacherService) {
        this.teacherService = teacherService;
    }
    getOverview(user) {
        return this.teacherService.getOverview(user.id);
    }
    listMyGroups(user) {
        return this.teacherService.listMyGroups(user.id);
    }
    getMyGroup(groupId, user) {
        return this.teacherService.getMyGroup(user.id, groupId);
    }
    getGroupStudents(groupId, user) {
        return this.teacherService.getGroupStudents(groupId, user);
    }
    listAssignments(user, groupId) {
        return this.teacherService.listAssignments(user.id, groupId);
    }
    getAssignment(id, user) {
        return this.teacherService.getAssignment(user.id, id);
    }
    createAssignment(user, dto) {
        return this.teacherService.createAssignment(user.id, dto);
    }
    updateAssignment(id, user, dto) {
        return this.teacherService.updateAssignment(user.id, id, dto);
    }
    removeAssignment(id, user) {
        return this.teacherService.removeAssignment(user.id, id);
    }
};
exports.TeacherController = TeacherController;
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('groups'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "listMyGroups", null);
__decorate([
    (0, common_1.Get)('groups/:groupId'),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "getMyGroup", null);
__decorate([
    (0, common_1.Get)('groups/:groupId/students'),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "getGroupStudents", null);
__decorate([
    (0, common_1.Get)('assignments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "listAssignments", null);
__decorate([
    (0, common_1.Get)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "getAssignment", null);
__decorate([
    (0, common_1.Post)('assignments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, teacher_assignments_dto_1.CreateAssignmentDto]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "createAssignment", null);
__decorate([
    (0, common_1.Patch)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, teacher_assignments_dto_1.UpdateAssignmentDto]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "updateAssignment", null);
__decorate([
    (0, common_1.Delete)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TeacherController.prototype, "removeAssignment", null);
exports.TeacherController = TeacherController = __decorate([
    (0, roles_decorator_1.Roles)('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
    (0, common_1.Controller)('api/v1/teacher'),
    __metadata("design:paramtypes", [teacher_service_1.TeacherService])
], TeacherController);
//# sourceMappingURL=teacher.controller.js.map