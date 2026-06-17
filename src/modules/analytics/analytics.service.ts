import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  async getRevenue() {
    return {
      daily: { value: 1200, change: 0.15 },
      weekly: { value: 8400, change: 0.08 },
      monthly: { value: 36000, change: 0.12 },
      currency: 'EGP',
    };
  }

  async getBookings() {
    return {
      total: 450,
      completed: 380,
      cancelled: 45,
      disputed: 5,
      averageRating: 4.5,
    };
  }
}
