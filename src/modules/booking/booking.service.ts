import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRequestDto } from './dto';
import { RequestCreatedEvent } from '../../events/types';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createRequest(dto: CreateRequestDto) {
    this.logger.log('Stub: Service request created');

    const requestId = 'mock-request-id';

    this.eventEmitter.emit(
      'request.created',
      new RequestCreatedEvent(requestId, 'mock-patient-id'),
    );

    return {
      id: requestId,
      ...dto,
      status: 'PENDING_OFFERS',
      createdAt: new Date().toISOString(),
    };
  }

  async getRequest(id: string) {
    return { id, status: 'PENDING_OFFERS', type: 'STANDARD' };
  }

  async getBooking(id: string) {
    return { id, status: 'NURSE_CONFIRMED' };
  }
}
