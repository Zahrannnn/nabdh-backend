import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'Temporary token from login step' })
  @IsString()
  @IsNotEmpty()
  @MinLength(32, { message: 'tempToken must be at least 32 characters' })
  @Matches(/^[a-f0-9]{32,}$/, { message: 'tempToken must be a valid hex string' })
  tempToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'totpCode must be a 6-digit number' })
  totpCode: string;
}
