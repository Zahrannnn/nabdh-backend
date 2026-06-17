import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Get('nurse/wallet')
  @ApiOperation({ summary: 'Get nurse wallet details' })
  async getWallet() {
    return this.paymentService.getWallet();
  }

  @Public()
  @Post('webhooks/paymob')
  @ApiOperation({ summary: 'Paymob payment webhook' })
  async paymobWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentService.handlePaymobWebhook(body);
  }

  @Public()
  @Post('webhooks/fawry')
  @ApiOperation({ summary: 'Fawry payment webhook' })
  async fawryWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentService.handleFawryWebhook(body);
  }
}
