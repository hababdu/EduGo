import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { RankingService } from './ranking.service';

interface ScoreChangedPayload {
  studentId: string;
  delta: number;
  source: string;
  subjectId?: string | null;
  groupIds?: string[];
}

/**
 * 66-band — REAL-TIME EVENTS.
 *
 * Room strategiyasi (84-band arxitekturasiga mos):
 *   user:{userId}        — shaxsiy SCORE_UPDATED xabarlari
 *   ranking:global        — global TOP ro'yxat yangilanishi
 *   ranking:group:{id}    — guruh reytingi
 *   ranking:subject:{id}  — fan reytingi
 *
 * Nega barcha userlarga broadcast qilinmaydi: ranking global bo'lsa ham,
 * faqat shu paytda reyting sahifasini OCHIB turgan clientlar
 * (ranking:global room'iga qo'shilganlar) xabarni oladi — bu keraksiz
 * tarmoq trafigini oldini oladi (84-band: "performance muammosi
 * keltirib chiqarmasligi uchun").
 */
@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
})
export class RankingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RankingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly rankingService: RankingService,
  ) {}

  /** Handshake orqali JWT tekshiriladi — anonim ulanishlarga ruxsat yo'q */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Token berilmagan');

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      // Har bir user avtomatik o'z shaxsiy room'iga qo'shiladi
      await client.join(`user:${payload.sub}`);
    } catch (err) {
      this.logger.warn(`WS ulanish rad etildi: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.IO xonalarni avtomatik tozalaydi — qo'shimcha ish kerak emas
  }

  /** Frontend reyting sahifasini ochganda shu eventni yuboradi: socket.emit('join:ranking', {scope:'global'}) */
  @SubscribeMessage('join:ranking')
  handleJoinRanking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { scope: 'global' | 'group' | 'subject'; id?: string },
  ) {
    if (data.scope === 'global') {
      client.join('ranking:global');
    } else if (data.scope === 'group' && data.id) {
      client.join(`ranking:group:${data.id}`);
    } else if (data.scope === 'subject' && data.id) {
      client.join(`ranking:subject:${data.id}`);
    }
  }

  /**
   * ScoreTransaction yaratilgan har safar (test submit, admin ball berish)
   * shu event chiqariladi — TestSessionService va AdminStudentsService'da.
   * Gateway bevosita chaqirilmaydi (tight coupling'dan qochish uchun),
   * EventEmitter orqali erkin bog'lanadi.
   */
  @OnEvent('score.changed')
  async onScoreChanged(payload: ScoreChangedPayload) {
    const newRank = await this.rankingService.getStudentRank(payload.studentId);

    // 1. Shaxsiy xabar — faqat shu studentga
    this.server.to(`user:${payload.studentId}`).emit('SCORE_UPDATED', {
      studentId: payload.studentId,
      delta: payload.delta,
      source: payload.source,
      newRank,
    });

    // 2. Global reyting — faqat shu sahifani ochib turganlarga
    const globalTop = await this.rankingService.getGlobalRanking(10);
    this.server.to('ranking:global').emit('RANKING_UPDATED', {
      scope: 'global',
      top: globalTop,
    });

    // 3. Fan reytingi (agar tegishli bo'lsa)
    if (payload.subjectId) {
      const subjectTop = await this.rankingService.getSubjectRanking(payload.subjectId, 10);
      this.server.to(`ranking:subject:${payload.subjectId}`).emit('RANKING_UPDATED', {
        scope: 'subject',
        subjectId: payload.subjectId,
        top: subjectTop,
      });
    }

    // 4. Guruh reytingi(lari)
    for (const groupId of payload.groupIds ?? []) {
      const groupTop = await this.rankingService.getGroupRanking(groupId, 10);
      this.server.to(`ranking:group:${groupId}`).emit('RANKING_UPDATED', {
        scope: 'group',
        groupId,
        top: groupTop,
      });
    }
  }
}
