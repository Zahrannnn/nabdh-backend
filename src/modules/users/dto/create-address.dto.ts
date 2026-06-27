import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  details?: string;
}
