import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CertificatesService } from './certificates.service';

export class IssueCertificateDto {
  @IsString() @MaxLength(64) studentId: string;
  @IsString() @MaxLength(64) groupId: string;
  @IsOptional() @IsString() @MaxLength(160) title?: string;
}

@Controller('api/v1/certificates')
export class CertificatesController {
  constructor(private readonly certs: CertificatesService) {}

  /** Ochiq: sertifikat haqiqiyligini tekshirish (QR kod shu sahifaga olib boradi). */
  @Public()
  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certs.verify(code);
  }

  @Roles('STUDENT')
  @Get('mine')
  mine(@CurrentUser() u: CurrentUserPayload) {
    return this.certs.mine(u);
  }

  @Roles('TEACHER', 'ADMIN')
  @Get()
  forGroup(@Query('groupId') groupId: string, @CurrentUser() u: CurrentUserPayload) {
    return this.certs.forGroup(u, groupId);
  }

  @Roles('TEACHER', 'ADMIN')
  @Post()
  issue(@Body() dto: IssueCertificateDto, @CurrentUser() u: CurrentUserPayload) {
    return this.certs.issue(u, dto);
  }

  @Roles('TEACHER', 'ADMIN')
  @Delete(':id')
  revoke(@Param('id') id: string, @CurrentUser() u: CurrentUserPayload) {
    return this.certs.revoke(u, id);
  }
}
