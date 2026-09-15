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
exports.AdminStudentsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let AdminStudentsService = class AdminStudentsService {
    constructor(prisma, audit, eventEmitter) {
        this.prisma = prisma;
        this.audit = audit;
        this.eventEmitter = eventEmitter;
    }
    async list(query) {
        const where = { role: 'STUDENT', deletedAt: null };
        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { username: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.groupId) {
            where.groupMemberships = { some: { groupId: query.groupId } };
        }
        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                include: { studentProfile: true },
                orderBy: { registeredAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            items: items.map((u) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                username: u.username,
                status: u.status,
                registeredAt: u.registeredAt,
                lastActiveAt: u.lastActiveAt,
                totalScore: u.studentProfile?.totalScore ?? 0,
                level: u.studentProfile?.level ?? 1,
            })),
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.ceil(total / query.pageSize),
        };
    }
    async getDetail(studentId) {
        const user = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: {
                studentProfile: true,
                streak: true,
                groupMemberships: { include: { group: true } },
                testAttempts: {
                    orderBy: { completedAt: 'desc' },
                    take: 10,
                    include: { test: { select: { title: true } } },
                },
                achievements: { include: { achievement: true } },
            },
        });
        if (!user || user.role !== 'STUDENT' || user.deletedAt) {
            throw new common_1.NotFoundException('Student topilmadi');
        }
        return user;
    }
    async setBlocked(studentId, blocked, actorId) {
        const user = await this.prisma.user.findUnique({ where: { id: studentId } });
        if (!user || user.role !== 'STUDENT') {
            throw new common_1.NotFoundException('Student topilmadi');
        }
        const newStatus = blocked ? 'BLOCKED' : 'ACTIVE';
        await this.prisma.user.update({
            where: { id: studentId },
            data: { status: newStatus },
        });
        await this.audit.log({
            actorId,
            action: blocked ? 'STUDENT_BLOCK' : 'STUDENT_UNBLOCK',
            targetType: 'User',
            targetId: studentId,
            oldValue: { status: user.status },
            newValue: { status: newStatus },
        });
        return { id: studentId, status: newStatus };
    }
    async adjustScore(studentId, dto, actorId) {
        if (dto.amount === 0) {
            throw new common_1.BadRequestException('Ball miqdori 0 bo\'lishi mumkin emas');
        }
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: studentId },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Student profili topilmadi');
        }
        const type = dto.amount > 0 ? 'ADMIN_ADD' : 'ADMIN_REMOVE';
        const [transaction] = await this.prisma.$transaction([
            this.prisma.scoreTransaction.create({
                data: {
                    studentId,
                    amount: dto.amount,
                    type,
                    description: dto.reason,
                    createdById: actorId,
                },
            }),
            this.prisma.studentProfile.update({
                where: { userId: studentId },
                data: { totalScore: { increment: dto.amount } },
            }),
        ]);
        await this.audit.log({
            actorId,
            action: 'SCORE_ADJUST',
            targetType: 'User',
            targetId: studentId,
            oldValue: { totalScore: profile.totalScore },
            newValue: { totalScore: profile.totalScore + dto.amount, amount: dto.amount, reason: dto.reason },
        });
        this.eventEmitter.emit('score.changed', {
            studentId,
            delta: dto.amount,
            source: dto.amount > 0 ? 'ADMIN_ADD' : 'ADMIN_REMOVE',
            subjectId: null,
            groupIds: [],
        });
        return transaction;
    }
};
exports.AdminStudentsService = AdminStudentsService;
exports.AdminStudentsService = AdminStudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        event_emitter_1.EventEmitter2])
], AdminStudentsService);
//# sourceMappingURL=admin-students.service.js.map