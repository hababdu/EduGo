export const ORGANIZATION_PERMISSIONS = [
  'organization.read',
  'organization.settings.manage',
  'branches.manage',
  'memberships.read',
  'memberships.manage',
  'memberships.permissions.manage',
  'students.read',
  'students.manage',
  'teachers.read',
  'teachers.manage',
  'courses.read',
  'courses.manage',
  'groups.read',
  'groups.manage',
  'lessons.read',
  'lessons.manage',
  'materials.read',
  'materials.manage',
  'assignments.read',
  'assignments.manage',
  'assignments.review',
  'tests.read',
  'tests.manage',
  'attendance.read',
  'attendance.manage',
  'grading.read',
  'grading.manage',
  'payments.read',
  'payments.manage',
  'analytics.read',
  'certificates.manage',
  'messaging.manage',
] as const;

export type OrganizationPermission = typeof ORGANIZATION_PERMISSIONS[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, OrganizationPermission[]> = {
  ADMIN: [...ORGANIZATION_PERMISSIONS],
  TEACHER: [
    'organization.read', 'students.read', 'teachers.read', 'courses.read', 'courses.manage',
    'groups.read', 'groups.manage', 'lessons.read', 'lessons.manage', 'materials.read',
    'materials.manage', 'assignments.read', 'assignments.manage', 'assignments.review',
    'tests.read', 'tests.manage', 'attendance.read', 'attendance.manage', 'grading.read',
    'grading.manage', 'analytics.read', 'messaging.manage',
  ],
  STUDENT: [
    'organization.read', 'courses.read', 'groups.read', 'lessons.read', 'materials.read',
    'assignments.read', 'tests.read', 'attendance.read', 'grading.read',
  ],
  PARENT: [
    'organization.read', 'students.read', 'attendance.read', 'grading.read',
    'payments.read', 'analytics.read', 'messaging.manage',
  ],
};

export function membershipHasPermission(
  role: string,
  permissions: unknown,
  required: OrganizationPermission,
): boolean {
  const overrides = permissions && typeof permissions === 'object' ? permissions as { allow?: unknown; deny?: unknown } : {};
  const allow = Array.isArray(overrides.allow) ? overrides.allow : [];
  const deny = Array.isArray(overrides.deny) ? overrides.deny : [];
  if (deny.includes(required)) return false;
  return allow.includes(required) || (DEFAULT_ROLE_PERMISSIONS[role] ?? []).includes(required);
}
