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
exports.InternalController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const internal_auth_guard_1 = require("./guards/internal-auth.guard");
const internal_service_1 = require("./internal.service");
let InternalController = class InternalController {
    constructor(internalService) {
        this.internalService = internalService;
    }
    getSummary(telegramId) {
        return this.internalService.getStudentSummary(telegramId);
    }
    getResults(telegramId, limit) {
        return this.internalService.getRecentResults(telegramId, limit ? Number(limit) : undefined);
    }
    getAchievements(telegramId) {
        return this.internalService.getAchievements(telegramId);
    }
    getTopRanking(limit) {
        return this.internalService.getTopRanking(limit ? Number(limit) : undefined);
    }
    getAnnouncements(limit) {
        return this.internalService.getRecentAnnouncements(limit ? Number(limit) : undefined);
    }
};
exports.InternalController = InternalController;
__decorate([
    (0, common_1.Get)('students/by-telegram/:telegramId/summary'),
    __param(0, (0, common_1.Param)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InternalController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('students/by-telegram/:telegramId/results'),
    __param(0, (0, common_1.Param)('telegramId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InternalController.prototype, "getResults", null);
__decorate([
    (0, common_1.Get)('students/by-telegram/:telegramId/achievements'),
    __param(0, (0, common_1.Param)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InternalController.prototype, "getAchievements", null);
__decorate([
    (0, common_1.Get)('ranking/top'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InternalController.prototype, "getTopRanking", null);
__decorate([
    (0, common_1.Get)('announcements'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InternalController.prototype, "getAnnouncements", null);
exports.InternalController = InternalController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(internal_auth_guard_1.InternalAuthGuard),
    (0, common_1.Controller)('api/v1/internal'),
    __metadata("design:paramtypes", [internal_service_1.InternalService])
], InternalController);
//# sourceMappingURL=internal.controller.js.map