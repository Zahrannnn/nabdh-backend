import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+201234567890', description: 'Egyptian mobile number (E.164 format)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+201[0-9]{9}$/, { message: 'phone must be a valid Egyptian mobile number' })
  phone: string;
}
