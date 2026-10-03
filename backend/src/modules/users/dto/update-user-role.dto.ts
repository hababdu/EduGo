import { IsIn } from 'class-validator';
import { ASSIGNABLE_ROLES } from '../users.service';

export class UpdateUserRoleDto {
  @IsIn([...ASSIGNABLE_ROLES], { message: "Noto'g'ri rol" })
  role: string;
}
