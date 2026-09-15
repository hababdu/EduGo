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
exports.TopicsController = exports.TopicsService = exports.UpdateTopicDto = exports.CreateTopicDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
class CreateTopicDto {
}
exports.CreateTopicDto = CreateTopicDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "sectionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "posterUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateTopicDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTopicDto.prototype, "sequentialLocked", void 0);
class UpdateTopicDto {
}
exports.UpdateTopicDto = UpdateTopicDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTopicDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTopicDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTopicDto.prototype, "posterUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTopicDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTopicDto.prototype, "sequentialLocked", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']),
    __metadata("design:type", String)
], UpdateTopicDto.prototype, "status", void 0);
let TopicsService = class TopicsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllBySection(sectionId, user) {
        const isStudent = user.role === 'STUDENT';
        const topics = await this.prisma.topic.findMany({
            where: { sectionId, deletedAt: null, ...(isStudent ? { status: 'PUBLISHED' } : {}) },
            orderBy: { order: 'asc' },
        });
        if (!isStudent)
            return topics;
        return this.withLockStatus(topics, user.id);
    }
    async withLockStatus(topics, studentId) {
        const sorted = [...topics].sort((a, b) => a.order - b.order);
        const result = [];
        let previousCompleted = true;
        for (const topic of sorted) {
            const isLocked = topic.sequentialLocked && !previousCompleted;
            result.push({ ...topic, isLocked });
            if (topic.sequentialLocked) {
                const attempt = await this.prisma.testAttempt.findFirst({
                    where: { studentId, test: { topicId: topic.id }, passed: true },
                });
                previousCompleted = !!attempt;
            }
        }
        return result;
    }
    async findOneFor(id, user) {
        const topic = await this.prisma.topic.findUnique({ where: { id } });
        if (!topic || topic.deletedAt)
            throw new common_1.NotFoundException('Mavzu topilmadi');
        if (user.role === 'STUDENT') {
            if (topic.status !== 'PUBLISHED')
                throw new common_1.NotFoundException('Mavzu topilmadi');
            const [locked] = await this.withLockStatus([topic], user.id);
            if (locked.isLocked) {
                throw new common_1.ForbiddenException('Bu mavzuni ochish uchun avval oldingi mavzuni yakunlang');
            }
        }
        return topic;
    }
    create(dto) {
        return this.prisma.topic.create({
            data: {
                sectionId: dto.sectionId,
                title: dto.title,
                description: dto.description,
                posterUrl: dto.posterUrl,
                order: dto.order ?? 0,
                sequentialLocked: dto.sequentialLocked ?? false,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.topic.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Mavzu topilmadi');
        return this.prisma.topic.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const existing = await this.prisma.topic.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Mavzu topilmadi');
        await this.prisma.topic.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.TopicsService = TopicsService;
exports.TopicsService = TopicsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TopicsService);
let TopicsController = class TopicsController {
    constructor(topicsService) {
        this.topicsService = topicsService;
    }
    findAll(sectionId, user) {
        return this.topicsService.findAllBySection(sectionId, user);
    }
    findOne(id, user) {
        return this.topicsService.findOneFor(id, user);
    }
    create(dto) {
        return this.topicsService.create(dto);
    }
    update(id, dto) {
        return this.topicsService.update(id, dto);
    }
    remove(id) {
        return this.topicsService.remove(id);
    }
};
exports.TopicsController = TopicsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('sectionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TopicsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TopicsController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTopicDto]),
    __metadata("design:returntype", void 0)
], TopicsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateTopicDto]),
    __metadata("design:returntype", void 0)
], TopicsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TopicsController.prototype, "remove", null);
exports.TopicsController = TopicsController = __decorate([
    (0, common_1.Controller)('api/v1/topics'),
    __metadata("design:paramtypes", [TopicsService])
], TopicsController);
//# sourceMappingURL=topics.all.js.map