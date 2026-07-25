import { IsString, IsNotEmpty, IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../../../common/enums';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address for OTP' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserType, example: UserType.PATIENT })
  @IsIn([UserType.PATIENT, UserType.NURSE], { message: 'role must be PATIENT or NURSE' })
  role: UserType;
}
