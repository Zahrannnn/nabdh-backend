import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsIn,
  IsOptional,
  IsObject,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../../../common/enums';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

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
