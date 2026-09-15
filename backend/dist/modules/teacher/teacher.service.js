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
exports.TeacherService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const groups_service_1 = require("../groups/groups.service");
const audit_service_1 = require("../admin/audit/audit.service");
let TeacherService = class TeacherService {
    constructor(prisma, groupsService, audit) {
        this.prisma = prisma;
        this.groupsService = groupsService;
        this.audit = audit;
    }
    async getOverview(teacherId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const groups = await this.prisma.group.findMany({
            where: { teacherId, deletedAt: null },
            include: { members: { select: { studentId: true } } },
        });
        const studentIds = Array.from(new Set(groups.flatMap((g) => g.members.map((m) => m.studentId))));
        const attemptsWhere = {
            studentId: { in: studentIds },
            completedAt: { lte: new Date() },
        };
        const [assignedTestsCount, assignmentsCount, recentAssignments, attemptsStats, dailyActivity, topStudents,] = await Promise.all([
            this.prisma.testAssignment.count({
                where: { assignedById: teacherId },
            }),
            this.prisma.teacherAssignment.count({
                where: { teacherId, deletedAt: null },
            }),
            this.prisma.testAssignment.findMany({
                where: { assignedById: teacherId },
                orderBy: { assignedAt: 'desc' },
                take: 5,
                include: {
                    test: { select: { id: true, title: true } },
                    group: { select: { id: true, name: true } },
                },
            }),
            studentIds.length > 0
                ? this.prisma.testAttempt.aggregate({
                    where: attemptsWhere,
                    _count: { _all: true },
                    _avg: { percent: true },
                })
                : Promise.resolve({ _count: { _all: 0 }, _avg: { percent: 0 } }),
            studentIds.length > 0
                ? this.getDailyActivity(studentIds, sevenDaysAgo)
                : Promise.resolve([]),
            studentIds.length > 0
                ? this.prisma.user.findMany({
                    where: { id: { in: studentIds }, deletedAt: null },
                    orderBy: { studentProfile: { totalScore: 'desc' } },
                    take: 5,
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        studentProfile: { select: { totalScore: true, level: true } },
                    },
                })
                : Promise.resolve([]),
        ]);
        const totalAttempts = attemptsStats._count._all ?? 0;
        const averageScore = attemptsStats._avg.percent != null
            ? Math.round(attemptsStats._avg.percent)
            : 0;
        return {
            groupsCount: groups.length,
            studentsCount: studentIds.length,
            assignedTestsCount,
            assignmentsCount,
            totalAttempts,
            averageScore,
            groups: groups.map((g) => ({
                id: g.id,
                name: g.name,
                studentsCount: g.members.length,
            })),
            recentAssignments: recentAssignments.map((a) => ({
                id: a.id,
                testId: a.test.id,
                testTitle: a.test.title,
                groupId: a.group?.id,
                groupName: a.group?.name ?? 'Individual',
                assignedAt: a.assignedAt,
            })),
            charts: { dailyActivity },
            topStudents: topStudents.map((s) => ({
                id: s.id,
                firstName: s.firstName,
                lastName: s.lastName,
                username: s.username,
                totalScore: s.studentProfile?.totalScore ?? 0,
                level: s.studentProfile?.level ?? 1,
            })),
        };
    }
    async getDailyActivity(studentIds, from) {
        const where = {
            studentId: { in: studentIds },
            completedAt: { gte: from },
        };
        const attempts = await this.prisma.testAttempt.findMany({
            where,
            select: { completedAt: true, percent: true, studentId: true },
        });
        const map = new Map();
        for (const a of attempts) {
            if (!a.completedAt)
                continue;
            const key = a.completedAt.toISOString().slice(0, 10);
            if (!map.has(key))
                map.set(key, { students: new Set(), percents: [] });
            const entry = map.get(key);
            entry.students.add(a.studentId);
            entry.percents.push(a.percent);
        }
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const key = d.toISOString().slice(0, 10);
            const entry = map.get(key);
            const avg = entry && entry.percents.length > 0
                ? Math.round(entry.percents.reduce((s, p) => s + p, 0) / entry.percents.length)
                : 0;
            result.push({
                date: key,
                count: entry?.students.size ?? 0,
                avgPercent: avg,
            });
        }
        return result;
    }
    async getGroupStudents(groupId, requester) {
        const group = await this.groupsService.findOneOrThrow(groupId, requester);
        const studentIds = group.members.map((m) => m.studentId);
        if (studentIds.length === 0)
            return [];
        const attemptsWhere = {
            studentId: { in: studentIds },
        };
        const [profiles, attemptCounts] = await Promise.all([
            this.prisma.user.findMany({
                where: { id: { in: studentIds } },
                include: { studentProfile: true },
            }),
            this.prisma.testAttempt.groupBy({
                by: ['studentId'],
                where: attemptsWhere,
                _count: { _all: true },
                _avg: { percent: true },
            }),
        ]);
        const attemptMap = new Map(attemptCounts.map((a) => [a.studentId, a]));
        return profiles.map((u) => {
            const stats = attemptMap.get(u.id);
            const testsCompleted = stats?._count._all ?? 0;
            const averagePercent = stats?._avg.percent != null ? Math.round(stats._avg.percent) : null;
            return {
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                username: u.username,
                totalScore: u.studentProfile?.totalScore ?? 0,
                level: u.studentProfile?.level ?? 1,
                testsCompleted,
                averagePercent,
            };
        });
    }
    async listMyGroups(teacherId) {
        return this.prisma.group.findMany({
            where: { teacherId, deletedAt: null },
            include: {
                _count: {
                    select: { members: true, assignments: true },
                },
            },
        });
    }
    async getMyGroup(teacherId, groupId) {
        const group = await this.prisma.group.findFirst({
            where: { id: groupId, teacherId, deletedAt: null },
            include: {
                members: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                username: true,
                                status: true,
                                studentProfile: {
                                    select: { totalScore: true, level: true },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: { members: true, assignments: true },
                },
            },
        });
        if (!group) {
            throw new common_1.NotFoundException('Guruh topilmadi yoki sizga tegishli emas');
        }
        return group;
    }
    async listAssignments(teacherId, groupId) {
        const where = {
            teacherId,
            deletedAt: null,
        };
        if (groupId) {
            const group = await this.prisma.group.findFirst({
                where: { id: groupId, teacherId, deletedAt: null },
            });
            if (!group) {
                throw new common_1.ForbiddenException('Bu guruh sizga tegishli emas');
            }
            where.groupId = groupId;
        }
        return this.prisma.teacherAssignment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                group: { select: { id: true, name: true } },
                tests: { orderBy: { order: 'asc' } },
            },
        });
    }
    async getAssignment(teacherId, id) {
        const item = await this.prisma.teacherAssignment.findFirst({
            where: { id, deletedAt: null },
            include: {
                group: { select: { id: true, name: true, teacherId: true } },
                tests: { orderBy: { order: 'asc' } },
            },
        });
        if (!item)
            throw new common_1.NotFoundException('Material topilmadi');
        if (item.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('Bu material sizga tegishli emas');
        }
        return item;
    }
    async createAssignment(teacherId, dto) {
        const group = await this.prisma.group.findFirst({
            where: { id: dto.groupId, deletedAt: null },
        });
        if (!group)
            throw new common_1.NotFoundException('Guruh topilmadi');
        if (group.teacherId !== teacherId) {
            throw new common_1.ForbiddenException("Siz faqat o'zingizga biriktirilgan guruhga material qo'sha olasiz");
        }
        if (dto.type !== 'TEXT' && !dto.mediaUrl?.trim()) {
            throw new common_1.BadRequestException("Media URL kiritilishi shart (TEXT bo'lmagan formatlar uchun)");
        }
        if (dto.tests && dto.tests.length > 0) {
            for (const [i, t] of dto.tests.entries()) {
                if (!t.question?.trim()) {
                    throw new common_1.BadRequestException(`${i + 1}-savol matni bo'sh bo'lishi mumkin emas`);
                }
                if (t.options.filter((o) => o?.trim()).length < 2) {
                    throw new common_1.BadRequestException(`${i + 1}-savolda kamida 2 ta variant kerak`);
                }
            }
        }
        const created = await this.prisma.$transaction(async (tx) => {
            const assignment = await tx.teacherAssignment.create({
                data: {
                    title: dto.title.trim(),
                    description: dto.description?.trim() || null,
                    type: dto.type,
                    category: dto.category,
                    mediaUrl: dto.mediaUrl?.trim() || null,
                    groupId: dto.groupId,
                    teacherId,
                },
            });
            if (dto.tests && dto.tests.length > 0) {
                await tx.assignmentTest.createMany({
                    data: dto.tests.map((t, i) => ({
                        assignmentId: assignment.id,
                        question: t.question.trim(),
                        options: t.options.map((o) => o.trim()),
                        correctOption: t.correctOption,
                        order: i,
                    })),
                });
            }
            return tx.teacherAssignment.findUnique({
                where: { id: assignment.id },
                include: {
                    group: { select: { id: true, name: true } },
                    tests: { orderBy: { order: 'asc' } },
                },
            });
        });
        await this.audit.log({
            actorId: teacherId,
            action: 'ASSIGNMENT_CREATE',
            targetType: 'TeacherAssignment',
            targetId: created.id,
            newValue: {
                title: created.title,
                groupId: created.groupId,
                category: created.category,
                testsCount: dto.tests?.length ?? 0,
            },
        });
        return created;
    }
    async updateAssignment(teacherId, id, dto) {
        const existing = await this.prisma.teacherAssignment.findFirst({
            where: { id, deletedAt: null },
        });
        if (!existing)
            throw new common_1.NotFoundException('Material topilmadi');
        if (existing.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('Bu material sizga tegishli emas');
        }
        if (dto.groupId && dto.groupId !== existing.groupId) {
            const newGroup = await this.prisma.group.findFirst({
                where: { id: dto.groupId, deletedAt: null },
            });
            if (!newGroup)
                throw new common_1.NotFoundException('Yangi guruh topilmadi');
            if (newGroup.teacherId !== teacherId) {
                throw new common_1.ForbiddenException('Yangi guruh sizga tegishli emas');
            }
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.teacherAssignment.update({
                where: { id },
                data: {
                    ...(dto.title !== undefined && { title: dto.title.trim() }),
                    ...(dto.description !== undefined && {
                        description: dto.description?.trim() || null,
                    }),
                    ...(dto.type !== undefined && { type: dto.type }),
                    ...(dto.category !== undefined && { category: dto.category }),
                    ...(dto.mediaUrl !== undefined && {
                        mediaUrl: dto.mediaUrl?.trim() || null,
                    }),
                    ...(dto.groupId !== undefined && { groupId: dto.groupId }),
                },
            });
            if (dto.tests !== undefined) {
                await tx.assignmentTest.deleteMany({ where: { assignmentId: id } });
                if (dto.tests.length > 0) {
                    await tx.assignmentTest.createMany({
                        data: dto.tests.map((t, i) => ({
                            assignmentId: id,
                            question: t.question.trim(),
                            options: t.options.map((o) => o.trim()),
                            correctOption: t.correctOption,
                            order: i,
                        })),
                    });
                }
            }
            return tx.teacherAssignment.findUnique({
                where: { id },
                include: {
                    group: { select: { id: true, name: true } },
                    tests: { orderBy: { order: 'asc' } },
                },
            });
        });
        await this.audit.log({
            actorId: teacherId,
            action: 'ASSIGNMENT_UPDATE',
            targetType: 'TeacherAssignment',
            targetId: id,
            oldValue: { title: existing.title, groupId: existing.groupId },
            newValue: { title: updated.title, groupId: updated.groupId },
        });
        return updated;
    }
    async removeAssignment(teacherId, id) {
        const existing = await this.prisma.teacherAssignment.findFirst({
            where: { id, deletedAt: null },
        });
        if (!existing)
            throw new common_1.NotFoundException('Material topilmadi');
        if (existing.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('Bu material sizga tegishli emas');
        }
        await this.prisma.teacherAssignment.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.audit.log({
            actorId: teacherId,
            action: 'ASSIGNMENT_DELETE',
            targetType: 'TeacherAssignment',
            targetId: id,
            oldValue: { title: existing.title, groupId: existing.groupId },
        });
        return { ok: true };
    }
};
exports.TeacherService = TeacherService;
exports.TeacherService = TeacherService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        groups_service_1.GroupsService,
        audit_service_1.AuditService])
], TeacherService);
//# sourceMappingURL=teacher.service.js.map