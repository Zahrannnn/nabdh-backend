import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    example: 'Home',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: 30.0444,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    example: 31.2357,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    example: 'Apartment 5, Building 10',
  })
  @IsOptional()
  @IsString()
  details?: string;
}
