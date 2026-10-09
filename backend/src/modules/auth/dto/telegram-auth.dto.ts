import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TelegramAuthDto {
  /**
   * Telegram WebApp tomonidan berilgan raw initData satri
   * (window.Telegram.WebApp.initData). Backend buni o'zi tekshiradi —
   * frontend tomonidan yuborilgan parse qilingan qiymatlarga ishonilmaydi.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  initData: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
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
