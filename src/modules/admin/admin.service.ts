import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  async getDashboard() {
    return {
      totalUsers: 150,
      totalNurses: 45,
      activeBookings: 12,
      pendingVerifications: 3,
      totalRevenue: 25000,
      currency: 'EGP',
    };
  }

  async getAuditLogs() {
    return [
      {
        id: 'log-1',
        action: 'USER_VERIFIED',
        entity: 'Nurse',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
