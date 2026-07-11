import { IsBoolean } from 'class-validator';

export class UpdateNurseAvailabilityDto {
  @IsBoolean()
  isOnline: boolean;
}
