import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function mockContext(user: any, handlerRoles?: string[]): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('@Roles() qo\'yilmagan bo\'lsa, har qanday autentifikatsiyalangan userga ruxsat beradi', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = mockContext({ role: 'STUDENT' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Kerakli rolga mos kelmasa ForbiddenException tashlaydi', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'TEACHER']);
    const ctx = mockContext({ role: 'STUDENT' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Kerakli rolga mos kelsa ruxsat beradi', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'TEACHER']);
    const ctx = mockContext({ role: 'TEACHER' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('SUPER_ADMIN har doim ruxsatga ega, @Roles() da ko\'rsatilmagan bo\'lsa ham', () => {
    reflector.getAllAndOverride.mockReturnValue(['TEACHER']);
    const ctx = mockContext({ role: 'SUPER_ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
