import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RankingService } from './ranking.service';
interface ScoreChangedPayload {
    studentId: string;
    delta: number;
    source: string;
    subjectId?: string | null;
    groupIds?: string[];
}
export declare class RankingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly rankingService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService, rankingService: RankingService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(_client: Socket): void;
    handleJoinRanking(client: Socket, data: {
        scope: 'global' | 'group' | 'subject';
        id?: string;
    }): void;
    onScoreChanged(payload: ScoreChangedPayload): Promise<void>;
}
export {};
