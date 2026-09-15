"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("./roles.guard");
function mockContext(user, handlerRoles) {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
    };
}
describe('RolesGuard', () => {
    let guard;
    let reflector;
    beforeEach(() => {
        reflector = { getAllAndOverride: jest.fn() };
        guard = new roles_guard_1.RolesGuard(reflector);
    });
    it('@Roles() qo\'yilmagan bo\'lsa, har qanday autentifikatsiyalangan userga ruxsat beradi', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const ctx = mockContext({ role: 'STUDENT' });
        expect(guard.canActivate(ctx)).toBe(true);
    });
    it('Kerakli rolga mos kelmasa ForbiddenException tashlaydi', () => {
        reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'TEACHER']);
        const ctx = mockContext({ role: 'STUDENT' });
        expect(() => guard.canActivate(ctx)).toThrow(common_1.ForbiddenException);
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
//# sourceMappingURL=roles.guard.spec.js.map