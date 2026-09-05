import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type AppRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * Foydalanish:
 *   @Roles('ADMIN', 'SUPER_ADMIN')
 *   @Delete(':id')
 *   deleteCourse() { ... }
 *
 * Bir nechta rol berilsa — ULARDAN BIRI yetarli (OR mantiqi).
 * Decorator qo'yilmasa — endpoint istalgan autentifikatsiyalangan
 * (JwtAuthGuard'dan o'tgan) userga ochiq bo'ladi.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
