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
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const audit_service_1 = require("../../admin/audit/audit.service");
let CoursesService = class CoursesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async findAllFor(user) {
        const isStudent = user.role === 'STUDENT';
        return this.prisma.course.findMany({
            where: {
                deletedAt: null,
                ...(isStudent ? { status: 'PUBLISHED' } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOneFor(id, user) {
        const course = await this.prisma.course.findUnique({ where: { id } });
        if (!course || course.deletedAt) {
            throw new common_1.NotFoundException('Kurs topilmadi');
        }
        if (user.role === 'STUDENT' && course.status !== 'PUBLISHED') {
            throw new common_1.NotFoundException('Kurs topilmadi');
        }
        return course;
    }
    async create(dto, actorId) {
        const rawDto = dto;
        const payloadData = {
            type: rawDto.type || 'TEXT',
            category: rawDto.category || 'LESSON',
            mediaUrl: rawDto.mediaUrl || '',
            content: rawDto.description || '',
        };
        const startDateValue = rawDto.startDate ? new Date(rawDto.startDate) : undefined;
        const endDateValue = rawDto.endDate ? new Date(rawDto.endDate) : undefined;
        const course = await this.prisma.course.create({
            data: {
                title: rawDto.title,
                description: JSON.stringify(payloadData),
                posterUrl: rawDto.posterUrl,
                startDate: startDateValue,
                endDate: endDateValue,
                createdById: actorId,
            },
        });
        await this.audit.log({
            actorId,
            action: 'COURSE_CREATE',
            targetType: 'Course',
            targetId: course.id,
            newValue: { title: course.title },
        });
        return course;
    }
    async update(id, dto, actorId) {
        const rawDto = dto;
        const existing = await this.prisma.course.findUnique({ where: { id } });
        if (!existing || !existing.id || existing.deletedAt) {
            throw new common_1.NotFoundException('Kurs topilmadi');
        }
        let descriptionToSave = existing.description;
        if (rawDto.description || rawDto.type || rawDto.category || rawDto.mediaUrl !== undefined) {
            let parsed = {};
            try {
                parsed = existing.description ? JSON.parse(existing.description) : {};
            }
            catch {
                parsed = { type: 'TEXT', category: 'LESSON', content: existing.description };
            }
            const updatedPayload = {
                ...parsed,
                ...(rawDto.type ? { type: rawDto.type } : {}),
                ...(rawDto.category ? { category: rawDto.category } : {}),
                ...(rawDto.mediaUrl !== undefined ? { mediaUrl: rawDto.mediaUrl } : {}),
                ...(rawDto.description ? { content: rawDto.description } : {}),
            };
            descriptionToSave = JSON.stringify(updatedPayload);
        }
        const startDateValue = rawDto.startDate !== undefined
            ? (rawDto.startDate ? new Date(rawDto.startDate) : null)
            : existing.startDate;
        const endDateValue = rawDto.endDate !== undefined
            ? (rawDto.endDate ? new Date(rawDto.endDate) : null)
            : existing.endDate;
        const updated = await this.prisma.course.update({
            where: { id },
            data: {
                title: rawDto.title ?? existing.title,
                description: descriptionToSave,
                posterUrl: rawDto.posterUrl ?? existing.posterUrl,
                startDate: startDateValue,
                endDate: endDateValue,
            },
        });
        await this.audit.log({
            actorId,
            action: 'COURSE_UPDATE',
            targetType: 'Course',
            targetId: id,
            oldValue: existing,
            newValue: rawDto,
        });
        return updated;
    }
    async remove(id, actorId) {
        const existing = await this.prisma.course.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) {
            throw new common_1.NotFoundException('Kurs topilmadi');
        }
        await this.prisma.course.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.audit.log({
            actorId,
            action: 'COURSE_DELETE',
            targetType: 'Course',
            targetId: id,
        });
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map