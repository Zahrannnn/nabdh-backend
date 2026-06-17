import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  @OnEvent('request.created')
  handleRequestCreated(payload: Record<string, unknown>) {
    this.logger.log(`Stub: Notification for request.created: ${JSON.stringify(payload)}`);
  }

  @OnEvent('offer.submitted')
  handleOfferSubmitted(payload: Record<string, unknown>) {
    this.logger.log(`Stub: Notification for offer.submitted: ${JSON.stringify(payload)}`);
  }

  @OnEvent('booking.status.changed')
  handleBookingStatusChanged(payload: Record<string, unknown>) {
    this.logger.log(`Stub: Notification for booking.status.changed: ${JSON.stringify(payload)}`);
  }

  async list() {
    return [
      { id: 'notif-1', title: 'New request', body: 'A patient needs nursing care', isRead: false },
    ];
  }
}
