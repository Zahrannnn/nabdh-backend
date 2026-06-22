import { IsString, IsNotEmpty, Matches, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../../../common/enums';

export class SendOtpDto {
  @ApiProperty({ example: '+201234567890', description: 'Egyptian mobile number (E.164 format)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20, { message: 'phone must not exceed 20 characters' })
  @Matches(/^\+201[0-9]{9}$/, { message: 'phone must be a valid Egyptian mobile number' })
  phone: string;

  @ApiProperty({ enum: UserType, example: UserType.PATIENT })
  @IsIn([UserType.PATIENT, UserType.NURSE], { message: 'role must be PATIENT or NURSE' })
  role: UserType;
}
