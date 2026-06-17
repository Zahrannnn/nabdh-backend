import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+201234567890' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+201[0-9]{9}$/, { message: 'phone must be a valid Egyptian mobile number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
