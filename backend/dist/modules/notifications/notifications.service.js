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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.botToken = this.configService.get('BOT_TOKEN');
    }
    async notify(userId, type, title, body) {
        const notification = await this.prisma.notification.create({
            data: { userId, type, title, body },
        });
        const sent = await this.sendViaTelegram(userId, title, body);
        if (sent) {
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { sentViaTelegram: true },
            });
        }
        return notification;
    }
    async notifyMany(userIds, type, title, body) {
        await Promise.all(userIds.map((id) => this.notify(id, type, title, body)));
    }
    listForUser(userId, limit = 30) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async markAsRead(id, userId) {
        await this.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    }
    async sendViaTelegram(userId, title, body) {
        if (!this.botToken)
            return false;
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return false;
        try {
            const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.telegramId,
                    text: `*${title}*\n\n${body}`,
                    parse_mode: 'Markdown',
                }),
            });
            return res.ok;
        }
        catch (err) {
            this.logger.warn(`Telegram xabar yuborilmadi (userId=${userId}): ${err.message}`);
            return false;
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map