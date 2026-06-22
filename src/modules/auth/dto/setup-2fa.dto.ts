import { ApiProperty } from '@nestjs/swagger';

export class SetupTwoFactorResponseDto {
  @ApiProperty({ description: 'TOTP secret in base32' })
  secret: string;

  @ApiProperty({ description: 'QR code as data URL' })
  qrCodeDataUrl: string;
}
