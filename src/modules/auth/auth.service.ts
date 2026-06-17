import { Injectable, Logger } from '@nestjs/common';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async sendOtp(_dto: SendOtpDto): Promise<{ success: boolean }> {
    this.logger.log(`Stub: OTP sent to ${_dto.phone}`);
    return { success: true };
  }

  async verifyOtp(_dto: VerifyOtpDto): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log(`Stub: OTP verified for ${_dto.phone}`);
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };
  }

  async refresh(_dto: RefreshTokenDto): Promise<{ accessToken: string }> {
    this.logger.log('Stub: Token refreshed');
    return { accessToken: 'mock-access-token' };
  }
}
