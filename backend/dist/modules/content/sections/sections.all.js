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
exports.SectionsController = exports.SectionsService = exports.UpdateSectionDto = exports.CreateSectionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
class CreateSectionDto {
}
exports.CreateSectionDto = CreateSectionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "posterUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSectionDto.prototype, "order", void 0);
class UpdateSectionDto {
}
exports.UpdateSectionDto = UpdateSectionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSectionDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSectionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSectionDto.prototype, "posterUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateSectionDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']),
    __metadata("design:type", String)
], UpdateSectionDto.prototype, "status", void 0);
let SectionsService = class SectionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAllBySubject(subjectId, user) {
        const isStudent = user.role === 'STUDENT';
        return this.prisma.section.findMany({
            where: { subjectId, deletedAt: null, ...(isStudent ? { status: 'PUBLISHED' } : {}) },
            orderBy: { order: 'asc' },
        });
    }
    async findOneFor(id, user) {
        const section = await this.prisma.section.findUnique({ where: { id } });
        if (!section || section.deletedAt)
            throw new common_1.NotFoundException('Bo\'lim topilmadi');
        if (user.role === 'STUDENT' && section.status !== 'PUBLISHED') {
            throw new common_1.NotFoundException('Bo\'lim topilmadi');
        }
        return section;
    }
    create(dto) {
        return this.prisma.section.create({
            data: {
                subjectId: dto.subjectId,
                title: dto.title,
                description: dto.description,
                posterUrl: dto.posterUrl,
                order: dto.order ?? 0,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.section.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Bo\'lim topilmadi');
        return this.prisma.section.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const existing = await this.prisma.section.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Bo\'lim topilmadi');
        await this.prisma.section.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.SectionsService = SectionsService;
exports.SectionsService = SectionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SectionsService);
let SectionsController = class SectionsController {
    constructor(sectionsService) {
        this.sectionsService = sectionsService;
    }
    findAll(subjectId, user) {
        return this.sectionsService.findAllBySubject(subjectId, user);
    }
    findOne(id, user) {
        return this.sectionsService.findOneFor(id, user);
    }
    create(dto) {
        return this.sectionsService.create(dto);
    }
    update(id, dto) {
        return this.sectionsService.update(id, dto);
    }
    remove(id) {
        return this.sectionsService.remove(id);
    }
};
exports.SectionsController = SectionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('subjectId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SectionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SectionsController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateSectionDto]),
    __metadata("design:returntype", void 0)
], SectionsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateSectionDto]),
    __metadata("design:returntype", void 0)
], SectionsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SectionsController.prototype, "remove", null);
exports.SectionsController = SectionsController = __decorate([
    (0, common_1.Controller)('api/v1/sections'),
    __metadata("design:paramtypes", [SectionsService])
], SectionsController);
//# sourceMappingURL=sections.all.js.map