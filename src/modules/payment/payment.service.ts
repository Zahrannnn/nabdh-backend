import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  async getWallet() {
    return {
      id: 'mock-wallet-id',
      balance: 1500.0,
      currency: 'EGP',
    };
  }

  async handlePaymobWebhook(_body: Record<string, unknown>) {
    this.logger.log('Stub: Paymob webhook received');
    return { received: true };
  }

  async handleFawryWebhook(_body: Record<string, unknown>) {
    this.logger.log('Stub: Fawry webhook received');
    return { received: true };
  }
}
