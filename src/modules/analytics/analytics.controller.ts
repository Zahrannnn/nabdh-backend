import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get('revenue')
  @ApiOperation({ summary: 'Revenue analytics (stub)' })
  async revenue() {
    return this.analyticsService.getRevenue();
  }

  @Public()
  @Get('bookings')
  @ApiOperation({ summary: 'Booking analytics (stub)' })
  async bookings() {
    return this.analyticsService.getBookings();
  }
}
