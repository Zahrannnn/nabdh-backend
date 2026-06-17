import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  async updateLocation(body: { latitude: number; longitude: number }) {
    this.logger.log(`Stub: Location updated: ${body.latitude}, ${body.longitude}`);
    return { success: true };
  }

  async findNearbyNurses() {
    return [
      { id: 'nurse-1', distance: 2.5, status: 'ONLINE' },
      { id: 'nurse-2', distance: 5.1, status: 'ONLINE' },
    ];
  }
}
