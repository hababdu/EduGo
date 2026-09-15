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
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let AssignmentsService = class AssignmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(teacherId, dto) {
        const { tests, ...assignmentData } = dto;
        return await this.prisma.assignment.create({
            data: {
                ...assignmentData,
                teacherId,
                tests: tests && tests.length > 0 ? {
                    create: tests.map((t) => ({
                        question: t.question,
                        options: t.options,
                        correctOption: t.correctOption,
                    }))
                } : undefined,
            },
            include: { tests: true },
        });
    }
    async findAllForTeacher(teacherId, groupId) {
        return await this.prisma.assignment.findMany({
            where: {
                teacherId,
                ...(groupId ? { groupId } : {}),
            },
            include: { tests: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, teacherId) {
        const item = await this.prisma.assignment.findUnique({
            where: { id },
            include: { tests: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Material topilmadi');
        if (item.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('Bu materialga ruxsat yoq');
        }
        return item;
    }
    async update(id, teacherId, dto) {
        await this.findOne(id, teacherId);
        const { tests, ...assignmentData } = dto;
        if (tests) {
            await this.prisma.assignmentTest.deleteMany({
                where: { assignmentId: id },
            });
        }
        return await this.prisma.assignment.update({
            where: { id },
            data: {
                ...assignmentData,
                tests: tests && tests.length > 0 ? {
                    create: tests.map((t) => ({
                        question: t.question,
                        options: t.options,
                        correctOption: t.correctOption,
                    }))
                } : undefined,
            },
            include: { tests: true },
        });
    }
    async remove(id, teacherId) {
        await this.findOne(id, teacherId);
        return await this.prisma.assignment.delete({
            where: { id },
        });
    }
};
exports.AssignmentsService = AssignmentsService;
exports.AssignmentsService = AssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map