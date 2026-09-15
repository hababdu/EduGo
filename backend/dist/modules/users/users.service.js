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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfileFor(targetUserId, requester) {
        const isSelf = targetUserId === requester.id;
        const isPrivileged = requester.role === 'ADMIN' || requester.role === 'SUPER_ADMIN';
        let isOwnerTeacher = false;
        if (requester.role === 'TEACHER' && !isSelf) {
            const sharedGroup = await this.prisma.groupMember.findFirst({
                where: {
                    studentId: targetUserId,
                    group: { teacherId: requester.id },
                },
            });
            isOwnerTeacher = !!sharedGroup;
        }
        if (!isSelf && !isPrivileged && !isOwnerTeacher) {
            throw new common_1.ForbiddenException('Siz faqat o\'z profilingizni yoki o\'z guruhingizdagi studentlarni ko\'ra olasiz');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            include: { studentProfile: true, streak: true },
        });
        if (!user || user.deletedAt) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi');
        }
        return user;
    }
    async findAllUsers() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                telegramId: true,
                firstName: true,
                lastName: true,
                username: true,
                role: true,
            },
        });
    }
    async updateRole(userId, role) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user || user.deletedAt) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: { role: role },
            select: {
                id: true,
                telegramId: true,
                role: true,
                firstName: true,
            }
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map