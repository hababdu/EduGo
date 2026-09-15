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
exports.TestManagementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const audit_service_1 = require("../../admin/audit/audit.service");
const notifications_service_1 = require("../../notifications/notifications.service");
let TestManagementService = class TestManagementService {
    constructor(prisma, audit, notifications) {
        this.prisma = prisma;
        this.audit = audit;
        this.notifications = notifications;
    }
    async list(requester, filters) {
        const where = { deletedAt: null };
        if (requester.role === 'TEACHER') {
            where.createdById = requester.id;
        }
        if (filters.subjectId)
            where.subjectId = filters.subjectId;
        if (filters.status)
            where.status = filters.status;
        return this.prisma.test.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                subject: { select: { title: true } },
                _count: { select: { questions: true, assignments: true, attempts: true } },
            },
        });
    }
    async getDetail(testId, requester) {
        const test = await this.prisma.test.findUnique({
            where: { id: testId },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    include: { question: { include: { options: true } } },
                },
                assignments: {
                    include: { group: { select: { name: true } } },
                    orderBy: { assignedAt: 'desc' },
                },
            },
        });
        if (!test || test.deletedAt)
            throw new common_1.NotFoundException('Test topilmadi');
        if (requester.role === 'TEACHER' && test.createdById !== requester.id) {
            throw new common_1.BadRequestException('Bu test sizga tegishli emas');
        }
        return test;
    }
    async listAssignedForStudent(studentId) {
        const groupIds = (await this.prisma.groupMember.findMany({ where: { studentId }, select: { groupId: true } })).map((g) => g.groupId);
        const assignments = await this.prisma.testAssignment.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { targetType: 'ALL' },
                    { targetType: 'GROUP', groupId: { in: groupIds } },
                    { targetType: 'INDIVIDUAL', studentId },
                ],
            },
            include: { test: true },
            orderBy: { assignedAt: 'desc' },
        });
        const uniqueByTest = new Map(assignments.map((a) => [a.testId, a]));
        const attempts = await this.prisma.testAttempt.findMany({
            where: { studentId, testId: { in: Array.from(uniqueByTest.keys()) } },
        });
        const attemptMap = new Map(attempts.map((a) => [a.testId, a]));
        return Array.from(uniqueByTest.values()).map((a) => {
            const attempt = attemptMap.get(a.testId);
            return {
                testId: a.testId,
                title: a.test.title,
                durationSeconds: a.test.durationSeconds,
                deadline: a.deadline,
                status: attempt
                    ? attempt.isRetakeAllowed
                        ? 'RETAKE_AVAILABLE'
                        : 'COMPLETED'
                    : 'PENDING',
                score: attempt?.score,
                maxScore: attempt?.maxScore,
                passed: attempt?.passed,
            };
        });
    }
    async create(dto, actorId) {
        const questions = await this.prisma.question.findMany({
            where: { id: { in: dto.questionIds }, deletedAt: null },
        });
        if (questions.length !== dto.questionIds.length) {
            throw new common_1.BadRequestException('Ba\'zi savollar topilmadi yoki o\'chirilgan');
        }
        const maxScore = dto.randomQuestions
            ? (dto.questionCount ?? dto.questionIds.length) *
                Math.round(questions.reduce((s, q) => s + q.points, 0) / questions.length)
            : questions.reduce((sum, q) => sum + q.points, 0);
        const test = await this.prisma.test.create({
            data: {
                title: dto.title,
                description: dto.description,
                subjectId: dto.subjectId,
                topicId: dto.topicId,
                durationSeconds: dto.durationSeconds,
                passingScore: dto.passingScore,
                maxScore,
                randomQuestions: dto.randomQuestions ?? false,
                randomAnswerOrder: dto.randomAnswerOrder ?? false,
                questionCount: dto.questionCount,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
                createdById: actorId,
                questions: {
                    create: dto.questionIds.map((questionId, i) => ({ questionId, order: i })),
                },
            },
        });
        await this.audit.log({
            actorId,
            action: 'TEST_CREATE',
            targetType: 'Test',
            targetId: test.id,
            newValue: { title: test.title },
        });
        return test;
    }
    async publish(testId, actorId) {
        const test = await this.getOrThrow(testId);
        await this.prisma.test.update({ where: { id: testId }, data: { status: 'PUBLISHED' } });
        await this.audit.log({
            actorId,
            action: 'TEST_PUBLISH',
            targetType: 'Test',
            targetId: testId,
            oldValue: { status: test.status },
            newValue: { status: 'PUBLISHED' },
        });
    }
    async assign(testId, dto, actorId) {
        await this.getOrThrow(testId);
        if (dto.targetType === 'GROUP' && !dto.groupId) {
            throw new common_1.BadRequestException('GROUP turi uchun groupId majburiy');
        }
        if (dto.targetType === 'INDIVIDUAL' && !dto.studentId) {
            throw new common_1.BadRequestException('INDIVIDUAL turi uchun studentId majburiy');
        }
        const assignment = await this.prisma.testAssignment.create({
            data: {
                testId,
                targetType: dto.targetType,
                groupId: dto.targetType === 'GROUP' ? dto.groupId : undefined,
                studentId: dto.targetType === 'INDIVIDUAL' ? dto.studentId : undefined,
                assignedById: actorId,
                deadline: dto.deadline ? new Date(dto.deadline) : undefined,
            },
        });
        await this.audit.log({
            actorId,
            action: 'TEST_ASSIGN',
            targetType: 'Test',
            targetId: testId,
            newValue: { targetType: dto.targetType, groupId: dto.groupId, studentId: dto.studentId },
        });
        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        const studentIds = await this.resolveTargetStudentIds(dto);
        if (test && studentIds.length > 0) {
            await this.notifications.notifyMany(studentIds, 'TEST_ASSIGNED', '📝 Yangi test biriktirildi', `"${test.title}" testi sizga biriktirildi.${dto.deadline ? ` Muddat: ${new Date(dto.deadline).toLocaleString('uz-UZ')}` : ''}`);
        }
        return assignment;
    }
    async resolveTargetStudentIds(dto) {
        if (dto.targetType === 'INDIVIDUAL' && dto.studentId) {
            return [dto.studentId];
        }
        if (dto.targetType === 'GROUP' && dto.groupId) {
            const members = await this.prisma.groupMember.findMany({
                where: { groupId: dto.groupId },
                select: { studentId: true },
            });
            return members.map((m) => m.studentId);
        }
        if (dto.targetType === 'ALL') {
            const students = await this.prisma.user.findMany({
                where: { role: 'STUDENT', deletedAt: null },
                select: { id: true },
            });
            return students.map((s) => s.id);
        }
        return [];
    }
    async reopenForStudent(testId, dto, actorId) {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { testId_studentId: { testId, studentId: dto.studentId } },
        });
        if (!attempt) {
            throw new common_1.NotFoundException('Bu student uchun tugatilgan urinish topilmadi');
        }
        await this.prisma.$transaction([
            this.prisma.testAttempt.update({
                where: { id: attempt.id },
                data: { isRetakeAllowed: true },
            }),
            this.prisma.testSession.deleteMany({
                where: { testId, studentId: dto.studentId },
            }),
        ]);
        await this.audit.log({
            actorId,
            action: 'TEST_REOPEN',
            targetType: 'TestAttempt',
            targetId: attempt.id,
            oldValue: { isRetakeAllowed: false },
            newValue: { isRetakeAllowed: true, studentId: dto.studentId },
        });
    }
    async getOrThrow(testId) {
        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test || test.deletedAt)
            throw new common_1.NotFoundException('Test topilmadi');
        return test;
    }
};
exports.TestManagementService = TestManagementService;
exports.TestManagementService = TestManagementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], TestManagementService);
//# sourceMappingURL=test-management.service.js.map