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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const crypto = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const telegram_verify_util_1 = require("./utils/telegram-verify.util");
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async loginWithTelegram(initData) {
        const botToken = this.configService.get('BOT_TOKEN');
        if (!botToken) {
            throw new common_1.InternalServerErrorException('BOT_TOKEN sozlanmagan');
        }
        let verified;
        try {
            verified = (0, telegram_verify_util_1.verifyTelegramInitData)(initData, botToken);
        }
        catch (err) {
            throw new common_1.UnauthorizedException(err.message);
        }
        const { user: tgUser } = verified;
        const telegramId = String(tgUser.id);
        let user = await this.prisma.user.findUnique({
            where: { telegramId },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    telegramId,
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name,
                    username: tgUser.username,
                    profilePhotoUrl: tgUser.photo_url,
                    role: 'STUDENT',
                    studentProfile: { create: {} },
                },
            });
        }
        else {
            if (user.status === 'BLOCKED') {
                throw new common_1.UnauthorizedException('Sizning akkauntingiz bloklangan. Administrator bilan bog\'laning.');
            }
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name,
                    username: tgUser.username,
                    profilePhotoUrl: tgUser.photo_url,
                    lastActiveAt: new Date(),
                },
            });
        }
        const tokens = await this.issueTokens(user.id, user.role);
        return {
            ...tokens,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName ?? undefined,
                username: user.username ?? undefined,
                role: user.role,
                profilePhotoUrl: user.profilePhotoUrl ?? undefined,
            },
        };
    }
    async refresh(rawRefreshToken) {
        const tokenHash = this.hashToken(rawRefreshToken);
        const stored = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
        });
        if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token yaroqsiz, qayta login qiling');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: stored.userId },
        });
        if (!user || user.status === 'BLOCKED') {
            throw new common_1.UnauthorizedException('Akkaunt topilmadi yoki bloklangan');
        }
        await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        });
        const tokens = await this.issueTokens(user.id, user.role);
        return {
            ...tokens,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName ?? undefined,
                username: user.username ?? undefined,
                role: user.role,
                profilePhotoUrl: user.profilePhotoUrl ?? undefined,
            },
        };
    }
    async logout(rawRefreshToken) {
        const tokenHash = this.hashToken(rawRefreshToken);
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async issueTokens(userId, role) {
        const payload = { sub: userId, role };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: ACCESS_TOKEN_TTL,
        });
        const rawRefreshToken = crypto.randomBytes(48).toString('hex');
        const tokenHash = this.hashToken(rawRefreshToken);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
        return { accessToken, refreshToken: rawRefreshToken };
    }
    hashToken(raw) {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map