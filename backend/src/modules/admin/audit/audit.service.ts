import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface LogParams {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * 57-band (AUDIT LOG) — "Muhim barcha admin amallari log qilinsin."
 * Bu servis har bir admin/teacher yozuvchi amali chaqiradigan YAGONA joy —
 * shu tufayli log formati va to'liqligi butun tizimda bir xil bo'ladi.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams) {
    await this.prisma.adminActionLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        oldValue: params.oldValue as any,
        newValue: params.newValue as any,
      },
    });
  }
}
