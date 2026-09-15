import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthTokensResponse } from './dto/telegram-auth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    loginWithTelegram(initData: string): Promise<AuthTokensResponse>;
    refresh(rawRefreshToken: string): Promise<AuthTokensResponse>;
    logout(rawRefreshToken: string): Promise<void>;
    private issueTokens;
    private hashToken;
}
