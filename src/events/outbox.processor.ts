import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of events) {
      try {
        this.eventEmitter.emit(event.eventType, event.payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to process outbox event ${event.id}: ${message}`);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
            lastError: message,
          },
        });
      }
    }
  }
}
