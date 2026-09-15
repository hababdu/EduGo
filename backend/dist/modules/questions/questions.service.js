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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let QuestionsService = class QuestionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(filter) {
        return this.prisma.question.findMany({
            where: {
                deletedAt: null,
                subjectId: filter.subjectId,
                topicId: filter.topicId,
                difficulty: filter.difficulty,
            },
            include: { options: { select: { id: true, text: true, order: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getFullForEditing(id) {
        const question = await this.prisma.question.findUnique({
            where: { id },
            include: { options: true },
        });
        if (!question || question.deletedAt)
            throw new common_1.NotFoundException('Savol topilmadi');
        return question;
    }
    async create(dto, actorId) {
        if (dto.type !== 'TEXT_ANSWER') {
            const correctCount = dto.options.filter((o) => o.isCorrect).length;
            if (correctCount === 0) {
                throw new common_1.BadRequestException('Kamida bitta to\'g\'ri javob belgilanishi shart');
            }
            if (dto.type === 'SINGLE_CHOICE' && correctCount > 1) {
                throw new common_1.BadRequestException('SINGLE_CHOICE turida faqat bitta to\'g\'ri javob bo\'lishi mumkin');
            }
        }
        return this.prisma.question.create({
            data: {
                type: dto.type,
                difficulty: dto.difficulty ?? 'MEDIUM',
                text: dto.text,
                explanation: dto.explanation,
                points: dto.points ?? 1,
                subjectId: dto.subjectId,
                topicId: dto.topicId,
                tags: dto.tags ?? [],
                createdById: actorId,
                options: {
                    create: dto.options.map((o, i) => ({
                        text: o.text,
                        isCorrect: o.isCorrect,
                        order: i,
                    })),
                },
            },
            include: { options: true },
        });
    }
    async remove(id) {
        const existing = await this.prisma.question.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Savol topilmadi');
        await this.prisma.question.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map