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
exports.SubjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SubjectsService = class SubjectsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllByCourse(courseId, user) {
        const isStudent = user.role === 'STUDENT';
        return this.prisma.subject.findMany({
            where: {
                courseId,
                deletedAt: null,
                ...(isStudent ? { status: 'PUBLISHED' } : {}),
            },
            orderBy: { order: 'asc' },
        });
    }
    async findOneFor(id, user) {
        const subject = await this.prisma.subject.findUnique({ where: { id } });
        if (!subject || subject.deletedAt)
            throw new common_1.NotFoundException('Fan topilmadi');
        if (user.role === 'STUDENT' && subject.status !== 'PUBLISHED') {
            throw new common_1.NotFoundException('Fan topilmadi');
        }
        return subject;
    }
    create(dto) {
        return this.prisma.subject.create({
            data: {
                courseId: dto.courseId,
                title: dto.title,
                description: dto.description,
                posterUrl: dto.posterUrl,
                order: dto.order ?? 0,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.subject.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Fan topilmadi');
        return this.prisma.subject.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const existing = await this.prisma.subject.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new common_1.NotFoundException('Fan topilmadi');
        await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.SubjectsService = SubjectsService;
exports.SubjectsService = SubjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubjectsService);
//# sourceMappingURL=subjects.service.js.map