import { ParentScopeGuard } from './parent-scope.guard';

const ctx = (role: string | undefined, url: string, method = 'GET') =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined, originalUrl: url, method }) }) }) as any;

describe('ParentScopeGuard', () => {
  const g = new ParentScopeGuard();
  it('ota-ona faqat oq ro\'yxatdagi yo\'llarga kiradi', () => {
    expect(g.canActivate(ctx('PARENT', '/api/v1/parent/children'))).toBe(true);
    expect(g.canActivate(ctx('PARENT', '/api/v1/notifications'))).toBe(true);
    expect(g.canActivate(ctx('PARENT', '/api/v1/users/me'))).toBe(true);
  });
  it('boshqa hamma narsa yopiq', () => {
    for (const u of ['/api/v1/groups', '/api/v1/dashboard/me', '/api/v1/payments/overview', '/api/v1/parentX', '/api/v1/users/me/x', '/api/v1/admin/students'])
      expect(() => g.canActivate(ctx('PARENT', u))).toThrow();
    expect(() => g.canActivate(ctx('PARENT', '/api/v1/users/me', 'PATCH'))).toThrow();
  });
  it('boshqa rollarga ta\'sir qilmaydi', () => {
    expect(g.canActivate(ctx('STUDENT', '/api/v1/groups'))).toBe(true);
    expect(g.canActivate(ctx(undefined, '/api/v1/groups'))).toBe(true);
  });
});
