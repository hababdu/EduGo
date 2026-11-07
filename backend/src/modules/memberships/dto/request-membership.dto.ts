import { IsEnum, IsString, MinLength } from 'class-validator';

export enum RequestedOrganizationRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export class RequestMembershipDto {
  @IsString()
  @MinLength(1)
  organizationId: string;

  @IsEnum(RequestedOrganizationRole)
  role: RequestedOrganizationRole;
}
