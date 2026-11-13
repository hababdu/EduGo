import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export class OrgQueryDto { @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string; }
export class SubjectDto { @IsString() @MinLength(2) @MaxLength(60) name!: string; @IsOptional() @IsString() @MaxLength(40) organizationId?: string; }
export class AssignDto {
  @IsString() @MinLength(5) @MaxLength(40) teacherId!: string;
  @IsString() @MinLength(5) @MaxLength(40) subjectId!: string;
  @IsString() @MinLength(5) @MaxLength(40) groupId!: string;
}
export class AssignmentsQueryDto extends OrgQueryDto {
  @IsOptional() @IsString() @MaxLength(40) teacherId?: string;
  @IsOptional() @IsString() @MaxLength(40) groupId?: string;
}
export class SlotDto {
  @IsInt() @Min(1) @Max(7) weekday!: number;
  @Matches(HHMM, { message: 'Vaqt HH:mm ko\'rinishida bo\'lsin' }) startTime!: string;
  @Matches(HHMM, { message: 'Vaqt HH:mm ko\'rinishida bo\'lsin' }) endTime!: string;
  @IsOptional() @IsString() @MaxLength(40) room?: string;
}

export class SessionDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(30) sessionType?: string;
  @IsString() @MinLength(5) @MaxLength(40) teacherId!: string;
  @IsOptional() @IsString() @MaxLength(40) studentId?: string;
  @IsOptional() @IsString() @MaxLength(40) groupId?: string;
  @IsString() startsAt!: string;
  @IsString() endsAt!: string;
  @IsOptional() @IsString() @MaxLength(60) room?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string;
}
export class SessionsQueryDto extends OrgQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsString() groupId?: string;
}
