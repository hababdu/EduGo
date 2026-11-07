import { IsEnum, IsString, MinLength } from 'class-validator';
import { RequestedOrganizationRole } from './request-membership.dto';

export enum AssignableOrganizationRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export class AssignMembershipDto {
  @IsString()
  @MinLength(1)
  userId: string;

  @IsEnum(AssignableOrganizationRole)
  role: AssignableOrganizationRole;
}
