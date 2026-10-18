import { ForbiddenException } from '@nestjs/common';
import { SuperReadOnlyGuard } from './super-readonly.guard';

const ctx = (role: string | undefined, method: string, url: string): any => ({
  switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined, method, originalUrl: url }) }),
});

describe('SuperReadOnlyGuard', () => {
  const g = new SuperReadOnlyGuard();

  it("super admin maktab ichini o'qiy oladi (GET)", () => {
    expect(g.canActivate(ctx('SUPER_ADMIN', 'GET', '/api/v1/groups?x=1'))).toBe(true);
  });
  it("super admin guruh/to'lov/test yozolmaydi", () => {
    for (const [m, u] of [['POST', '/api/v1/groups'], ['PUT', '/api/v1/payments/g1'], ['PATCH', '/api/v1/admin/students/1'], ['DELETE', '/api/v1/tests/5'], ['POST', '/api/v1/users/1/role']]) {
      expect(() => g.canActivate(ctx('SUPER_ADMIN', m, u))).toThrow(ForbiddenException);
    }
  });
  it('super admin o\'z paneli (maktab, admin, obuna) va profilini o\'zgartira oladi', () => {
    expect(g.canActivate(ctx('SUPER_ADMIN', 'POST', '/api/v1/super/organizations'))).toBe(true);
    expect(g.canActivate(ctx('SUPER_ADMIN', 'PUT', '/api/v1/super/billing/o1'))).toBe(true);
    expect(g.canActivate(ctx('SUPER_ADMIN', 'PATCH', '/api/v1/users/me'))).toBe(true);
  });
  it('maktab admini va boshqalarga tegmaydi', () => {
    expect(g.canActivate(ctx('ADMIN', 'POST', '/api/v1/groups'))).toBe(true);
    expect(g.canActivate(ctx('TEACHER', 'DELETE', '/api/v1/tests/1'))).toBe(true);
  });
});
