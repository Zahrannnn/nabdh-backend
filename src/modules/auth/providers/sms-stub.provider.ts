import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms.provider';

@Injectable()
export class SmsStubProvider extends SmsProvider {
  private readonly logger = new Logger(SmsStubProvider.name);

  async sendSms(phone: string, message: string): Promise<void> {
    this.logger.log(`[SMS Stub] To: ${phone}, Body: ${message}`);
  }
}
