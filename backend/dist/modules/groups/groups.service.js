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
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let GroupsService = class GroupsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findGroupStudents(groupId, user) {
        await this.findOneOrThrow(groupId, user);
        return this.prisma.groupMember.findMany({
            where: { groupId },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        phone: true,
                        role: true,
                    },
                },
            },
        });
    }
    async findAllForUser(user) {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            return this.prisma.group.findMany({
                where: { deletedAt: null },
                include: {
                    _count: { select: { members: true } },
                    teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
                },
            });
        }
        if (user.role === 'TEACHER') {
            return this.prisma.group.findMany({
                where: { teacherId: user.id, deletedAt: null },
                include: {
                    _count: { select: { members: true } },
                    teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
                },
            });
        }
        return this.prisma.group.findMany({
            where: {
                deletedAt: null,
                members: { some: { studentId: user.id } },
            },
            include: {
                _count: { select: { members: true } },
                teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
            },
        });
    }
    async createGroup(data, user) {
        const teacherId = user.role === 'TEACHER' ? user.id : undefined;
        return this.prisma.group.create({
            data: {
                name: data.name,
                description: data.description,
                teacherId: teacherId,
            },
        });
    }
    async addStudentToGroup(groupId, studentId, user) {
        await this.findOneOrThrow(groupId, user);
        const existing = await this.prisma.groupMember.findUnique({
            where: { groupId_studentId: { groupId, studentId } },
        });
        if (existing) {
            throw new common_1.BadRequestException("Bu talaba allaqachon guruhga qo'shilgan");
        }
        return this.prisma.groupMember.create({
            data: { groupId, studentId },
        });
    }
    async findOneOrThrow(groupId, user) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                members: true,
                teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
            },
        });
        if (!group || group.deletedAt) {
            throw new common_1.NotFoundException('Guruh topilmadi');
        }
        this.assertCanAccess(group, user);
        return group;
    }
    async removeStudentFromGroup(groupId, studentId, user) {
        await this.findOneOrThrow(groupId, user);
        return this.prisma.groupMember.deleteMany({
            where: { groupId, studentId },
        });
    }
    async assignTeacher(groupId, teacherId, user) {
        await this.findOneOrThrow(groupId, user);
        return this.prisma.group.update({
            where: { id: groupId },
            data: {
                teacher: teacherId ? { connect: { id: teacherId } } : { disconnect: true },
            },
        });
    }
    async deleteGroup(groupId, user) {
        const group = await this.findOneOrThrow(groupId, user);
        return this.prisma.group.update({
            where: { id: group.id },
            data: { deletedAt: new Date() },
        });
    }
    assertCanAccess(group, user) {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            return;
        }
        if (user.role === 'TEACHER') {
            if (group.teacherId !== user.id) {
                throw new common_1.ForbiddenException('Bu guruh sizga biriktirilmagan');
            }
            return;
        }
        const isMember = group.members.some((m) => m.studentId === user.id);
        if (!isMember) {
            throw new common_1.ForbiddenException("Siz bu guruhga a'zo emassiz");
        }
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map