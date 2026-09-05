import { IsNotEmpty, IsString } from 'class-validator';

export class TelegramAuthDto {
  /**
   * Telegram WebApp tomonidan berilgan raw initData satri
   * (window.Telegram.WebApp.initData). Backend buni o'zi tekshiradi —
   * frontend tomonidan yuborilgan parse qilingan qiymatlarga ishonilmaydi.
   */
  @IsString()
  @IsNotEmpty()
  initData: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
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
