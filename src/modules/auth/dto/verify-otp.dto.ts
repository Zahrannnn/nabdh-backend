import {
  IsString,
  IsNotEmpty,
  Matches,
  IsIn,
  IsOptional,
  IsObject,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../../../common/enums';

export class VerifyOtpDto {
  @ApiProperty({ example: '+201234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20, { message: 'phone must not exceed 20 characters' })
  @Matches(/^\+201[0-9]{9}$/, { message: 'phone must be a valid Egyptian mobile number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'code must be 6 digits' })
  code: string;

  @ApiProperty({ enum: UserType, example: UserType.PATIENT })
  @IsIn([UserType.PATIENT, UserType.NURSE], { message: 'role must be PATIENT or NURSE' })
  role: UserType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}
