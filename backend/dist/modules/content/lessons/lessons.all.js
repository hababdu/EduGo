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
exports.LessonsController = exports.LessonsService = exports.CreateMaterialDto = exports.CreateVideoDto = exports.UpdateVideoProgressDto = exports.UpdateLessonDto = exports.CreateLessonDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const streak_service_1 = require("../../gamification/streak/streak.service");
class CreateLessonDto {
}
exports.CreateLessonDto = CreateLessonDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "topicId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "order", void 0);
class UpdateLessonDto {
}
exports.UpdateLessonDto = UpdateLessonDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLessonDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateLessonDto.prototype, "order", void 0);
class UpdateVideoProgressDto {
}
exports.UpdateVideoProgressDto = UpdateVideoProgressDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateVideoProgressDto.prototype, "percent", void 0);
class CreateVideoDto {
}
exports.CreateVideoDto = CreateVideoDto;
__decorate([
    (0, class_validator_1.IsIn)(['YOUTUBE', 'TELEGRAM', 'EXTERNAL_URL', 'CLOUD_STORAGE']),
    __metadata("design:type", String)
], CreateVideoDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVideoDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateVideoDto.prototype, "duration", void 0);
class CreateMaterialDto {
}
exports.CreateMaterialDto = CreateMaterialDto;
__decorate([
    (0, class_validator_1.IsIn)(['PDF', 'DOC', 'PPT', 'IMAGE', 'OTHER']),
    __metadata("design:type", String)
], CreateMaterialDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMaterialDto.prototype, "fileUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMaterialDto.prototype, "title", void 0);
let LessonsService = class LessonsService {
    constructor(prisma, streakService) {
        this.prisma = prisma;
        this.streakService = streakService;
    }
    findAllByTopic(topicId) {
        return this.prisma.lesson.findMany({
            where: { topicId },
            orderBy: { order: 'asc' },
            include: { videos: true, materials: true },
        });
    }
    create(dto) {
        return this.prisma.lesson.create({
            data: { topicId: dto.topicId, title: dto.title, order: dto.order ?? 0 },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.lesson.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Dars topilmadi');
        return this.prisma.lesson.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const existing = await this.prisma.lesson.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Dars topilmadi');
        await this.prisma.lesson.delete({ where: { id } });
    }
    async addVideo(lessonId, dto) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Dars topilmadi');
        return this.prisma.video.create({
            data: { lessonId, source: dto.source, url: dto.url, duration: dto.duration },
        });
    }
    async addMaterial(lessonId, dto) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Dars topilmadi');
        return this.prisma.material.create({
            data: { lessonId, type: dto.type, fileUrl: dto.fileUrl, title: dto.title },
        });
    }
    async updateVideoProgress(videoId, percent, studentId) {
        const video = await this.prisma.video.findUnique({ where: { id: videoId } });
        if (!video)
            throw new common_1.NotFoundException('Video topilmadi');
        const result = await this.prisma.videoProgress.upsert({
            where: { videoId_studentId: { videoId, studentId } },
            create: { videoId, studentId, percent },
            update: { percent },
        });
        if (percent >= 25) {
            await this.streakService.recordActivity(studentId);
        }
        return result;
    }
};
exports.LessonsService = LessonsService;
exports.LessonsService = LessonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        streak_service_1.StreakService])
], LessonsService);
let LessonsController = class LessonsController {
    constructor(lessonsService) {
        this.lessonsService = lessonsService;
    }
    findAll(topicId) {
        return this.lessonsService.findAllByTopic(topicId);
    }
    create(dto) {
        return this.lessonsService.create(dto);
    }
    update(id, dto) {
        return this.lessonsService.update(id, dto);
    }
    remove(id) {
        return this.lessonsService.remove(id);
    }
    addVideo(lessonId, dto) {
        return this.lessonsService.addVideo(lessonId, dto);
    }
    addMaterial(lessonId, dto) {
        return this.lessonsService.addMaterial(lessonId, dto);
    }
    updateProgress(videoId, dto, user) {
        return this.lessonsService.updateVideoProgress(videoId, dto.percent, user.id);
    }
};
exports.LessonsController = LessonsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('topicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLessonDto]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLessonDto]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "remove", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(':lessonId/videos'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateVideoDto]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "addVideo", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
    (0, common_1.Post)(':lessonId/materials'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateMaterialDto]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "addMaterial", null);
__decorate([
    (0, common_1.Patch)('videos/:videoId/progress'),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateVideoProgressDto, Object]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "updateProgress", null);
exports.LessonsController = LessonsController = __decorate([
    (0, common_1.Controller)('api/v1/lessons'),
    __metadata("design:paramtypes", [LessonsService])
], LessonsController);
//# sourceMappingURL=lessons.all.js.map