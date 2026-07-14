import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min, IsEnum } from 'class-validator';
import { GenderPreference } from '@common/enums';

export class NearbyQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm = 15;

  @IsOptional()
  @IsEnum(GenderPreference)
  genderPref?: GenderPreference;
}
