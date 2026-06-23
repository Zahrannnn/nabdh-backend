import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../common/enums';

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'fullName must not exceed 200 characters' })
  fullName: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
