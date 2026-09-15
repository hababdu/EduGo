export interface TelegramUserPayload {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}
export interface TelegramInitData {
    user: TelegramUserPayload;
    auth_date: number;
}
export declare function verifyTelegramInitData(initData: string, botToken: string): TelegramInitData;
