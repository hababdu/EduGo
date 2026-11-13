import { membershipHasPermission } from './organization-permissions';

describe('organization membership permissions', () => {
  it('uses organization role defaults', () => {
    expect(membershipHasPermission('TEACHER', null, 'assignments.review')).toBe(true);
    expect(membershipHasPermission('TEACHER', null, 'payments.manage')).toBe(false);
  });

  it('supports membership-specific permission grants', () => {
    expect(membershipHasPermission('STUDENT', { allow: ['assignments.review'], deny: [] }, 'assignments.review')).toBe(true);
  });

  it('allows explicit deny to override role defaults', () => {
    expect(membershipHasPermission('ADMIN', { allow: [], deny: ['branches.manage'] }, 'branches.manage')).toBe(false);
  });
});
