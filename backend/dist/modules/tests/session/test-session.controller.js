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
exports.TestSessionController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const test_session_service_1 = require("./test-session.service");
const submit_answer_dto_1 = require("./dto/submit-answer.dto");
let TestSessionController = class TestSessionController {
    constructor(sessionService) {
        this.sessionService = sessionService;
    }
    start(testId, user) {
        return this.sessionService.start(testId, user.id);
    }
    saveAnswer(testId, dto, user) {
        return this.sessionService.saveAnswer(testId, user.id, dto);
    }
    getSession(testId, user) {
        return this.sessionService.getSession(testId, user.id);
    }
    submit(testId, user) {
        return this.sessionService.submit(testId, user.id);
    }
};
exports.TestSessionController = TestSessionController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Param)('testId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TestSessionController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('answer'),
    __param(0, (0, common_1.Param)('testId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, submit_answer_dto_1.SubmitAnswerDto, Object]),
    __metadata("design:returntype", void 0)
], TestSessionController.prototype, "saveAnswer", null);
__decorate([
    (0, common_1.Get)('session'),
    __param(0, (0, common_1.Param)('testId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TestSessionController.prototype, "getSession", null);
__decorate([
    (0, common_1.Post)('submit'),
    __param(0, (0, common_1.Param)('testId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TestSessionController.prototype, "submit", null);
exports.TestSessionController = TestSessionController = __decorate([
    (0, common_1.Controller)('api/v1/tests/:testId'),
    __metadata("design:paramtypes", [test_session_service_1.TestSessionService])
], TestSessionController);
//# sourceMappingURL=test-session.controller.js.map