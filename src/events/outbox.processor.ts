import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxEvent, OutboxEventDocument } from './schemas/outbox-event.schema';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    @InjectModel(OutboxEvent.name) private readonly outboxModel: Model<OutboxEventDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    const events = await this.outboxModel
      .find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(50)
      .exec();

    for (const event of events) {
      try {
        this.eventEmitter.emit(event.eventType, event.payload);
        await this.outboxModel.updateOne(
          { _id: event._id },
          { $set: { status: 'PROCESSED', processedAt: new Date() } },
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to process outbox event ${event._id}: ${message}`);
        await this.outboxModel.updateOne(
          { _id: event._id },
          { $set: { status: 'FAILED', lastError: message }, $inc: { retryCount: 1 } },
        );
      }
    }
  }
}
