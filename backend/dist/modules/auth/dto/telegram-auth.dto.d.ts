export declare class TelegramAuthDto {
    initData: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export interface AuthTokensResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        firstName: string;
        lastName?: string;
        username?: string;
        role: string;
        profilePhotoUrl?: string;
    };
}
