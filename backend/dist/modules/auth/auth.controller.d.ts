import { AuthService } from './auth.service';
import { TelegramAuthDto, RefreshTokenDto } from './dto/telegram-auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    telegramLogin(dto: TelegramAuthDto): Promise<import("./dto/telegram-auth.dto").AuthTokensResponse>;
    refresh(dto: RefreshTokenDto): Promise<import("./dto/telegram-auth.dto").AuthTokensResponse>;
    logout(dto: RefreshTokenDto): Promise<void>;
}
