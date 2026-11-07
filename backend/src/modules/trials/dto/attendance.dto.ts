import { IsBoolean } from 'class-validator';

export class TrialAttendanceDto {
  @IsBoolean()
  attended: boolean;
}
