import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/** Ota-ona (PARENT) faqat shu yo'llarga kira oladi — qolgan hamma narsa yopiq (oq ro'yxat). */
const ALLOWED = ['/api/v1/auth', '/api/v1/parent', '/api/v1/notifications', '/api/v1/health'];

@Injectable()
export class ParentScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role !== 'PARENT') return true;
    const path: string = (req.originalUrl || req.url || '').split('?')[0];
    if (path === '/api/v1/users/me' && req.method === 'GET') return true;
    if (ALLOWED.some((p) => path === p || path.startsWith(p + '/'))) return true;
    throw new ForbiddenException("Ota-ona uchun bu bo'lim yopiq");
  }
}
