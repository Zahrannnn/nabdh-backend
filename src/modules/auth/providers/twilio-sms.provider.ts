import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { SmsProvider } from './sms.provider';

@Injectable()
export class TwilioSmsProvider extends SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly client: ReturnType<typeof twilio>;

  constructor(private readonly configService: ConfigService) {
    super();
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.client = twilio(accountSid, authToken);
  }

  async sendSms(phone: string, message: string): Promise<void> {
    const from = this.configService.get<string>('TWILIO_FROM_NUMBER');
    await this.client.messages.create({
      to: phone,
      from,
      body: message,
    });
    this.logger.log(`SMS sent to ${phone} via Twilio`);
  }
}
