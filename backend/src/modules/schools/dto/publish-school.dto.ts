import { IsBoolean } from 'class-validator';

export class PublishSchoolDto {
  @IsBoolean()
  publiclyListed: boolean;
}
