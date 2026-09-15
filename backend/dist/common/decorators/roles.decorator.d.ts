export declare const ROLES_KEY = "roles";
export type AppRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN';
export declare const Roles: (...roles: AppRole[]) => import("@nestjs/common").CustomDecorator<string>;
