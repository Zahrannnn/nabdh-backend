import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  /** GPS speed in km/h — non-negative, capped at a plausible physical max. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  speed?: number;
}
