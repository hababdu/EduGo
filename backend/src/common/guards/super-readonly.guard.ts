import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/** Maktab ichidagi (guruh, to'lov, o'quvchi, test...) ma'lumotlarni faqat maktab admini o'zgartiradi. */
const SCHOOL_OPS = [
  '/api/v1/groups',
  '/api/v1/payments',
  '/api/v1/admin',
  '/api/v1/teacher',
  '/api/v1/assignments',
  '/api/v1/tests',
  '/api/v1/questions',
  '/api/v1/submissions',
  '/api/v1/challenges',
  '/api/v1/users',
  '/api/v1/certificates',
];

/**
 * SUPER_ADMIN maktab ichidagi ishlar bo'yicha FAQAT KO'RADI (GET). Maktab, admin va obuna
 * boshqaruvi `/api/v1/super/*` orqali. JwtAuthGuard'dan keyin ishlaydi.
 */
@Injectable()
export class SuperReadOnlyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role !== 'SUPER_ADMIN') return true;
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const path: string = (req.originalUrl || req.url || '').split('?')[0];
    if (path === '/api/v1/users/me' || path.startsWith('/api/v1/users/me/')) return true;
    if (SCHOOL_OPS.some((p) => path === p || path.startsWith(p + '/'))) {
      throw new ForbiddenException(
        "Super admin maktab ichidagi ma'lumotlarni o'zgartira olmaydi. Buni maktab admini qiladi.",
      );
    }
    return true;
  }
}
