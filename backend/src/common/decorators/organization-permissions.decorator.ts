import { SetMetadata } from '@nestjs/common';
import { OrganizationPermission } from '../organization-permissions';

export const ORGANIZATION_PERMISSIONS_KEY = 'organization_permissions';
export const RequirePermissions = (...permissions: OrganizationPermission[]) =>
  SetMetadata(ORGANIZATION_PERMISSIONS_KEY, permissions);
