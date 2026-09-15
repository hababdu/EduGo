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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RankingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const ranking_service_1 = require("./ranking.service");
let RankingGateway = RankingGateway_1 = class RankingGateway {
    constructor(jwtService, rankingService) {
        this.jwtService = jwtService;
        this.rankingService = rankingService;
        this.logger = new common_1.Logger(RankingGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token;
            if (!token)
                throw new Error('Token berilmagan');
            const payload = this.jwtService.verify(token);
            client.data.userId = payload.sub;
            await client.join(`user:${payload.sub}`);
        }
        catch (err) {
            this.logger.warn(`WS ulanish rad etildi: ${err.message}`);
            client.disconnect();
        }
    }
    handleDisconnect(_client) {
    }
    handleJoinRanking(client, data) {
        if (data.scope === 'global') {
            client.join('ranking:global');
        }
        else if (data.scope === 'group' && data.id) {
            client.join(`ranking:group:${data.id}`);
        }
        else if (data.scope === 'subject' && data.id) {
            client.join(`ranking:subject:${data.id}`);
        }
    }
    async onScoreChanged(payload) {
        const newRank = await this.rankingService.getStudentRank(payload.studentId);
        this.server.to(`user:${payload.studentId}`).emit('SCORE_UPDATED', {
            studentId: payload.studentId,
            delta: payload.delta,
            source: payload.source,
            newRank,
        });
        const globalTop = await this.rankingService.getGlobalRanking(10);
        this.server.to('ranking:global').emit('RANKING_UPDATED', {
            scope: 'global',
            top: globalTop,
        });
        if (payload.subjectId) {
            const subjectTop = await this.rankingService.getSubjectRanking(payload.subjectId, 10);
            this.server.to(`ranking:subject:${payload.subjectId}`).emit('RANKING_UPDATED', {
                scope: 'subject',
                subjectId: payload.subjectId,
                top: subjectTop,
            });
        }
        for (const groupId of payload.groupIds ?? []) {
            const groupTop = await this.rankingService.getGroupRanking(groupId, 10);
            this.server.to(`ranking:group:${groupId}`).emit('RANKING_UPDATED', {
                scope: 'group',
                groupId,
                top: groupTop,
            });
        }
    }
};
exports.RankingGateway = RankingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RankingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:ranking'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RankingGateway.prototype, "handleJoinRanking", null);
__decorate([
    (0, event_emitter_1.OnEvent)('score.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RankingGateway.prototype, "onScoreChanged", null);
exports.RankingGateway = RankingGateway = RankingGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws',
        cors: { origin: true, credentials: true },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        ranking_service_1.RankingService])
], RankingGateway);
//# sourceMappingURL=ranking.gateway.js.map