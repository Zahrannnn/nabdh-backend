import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OutboxStatus } from '../../common/enums';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ collection: 'outbox_events', timestamps: { createdAt: true, updatedAt: false } })
export class OutboxEvent {
  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true, type: Object })
  payload: Record<string, unknown>;

  @Prop()
  idempotencyKey?: string;

  @Prop({ required: true, enum: OutboxStatus, default: OutboxStatus.PENDING })
  status: OutboxStatus;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  lastError?: string;

  @Prop()
  processedAt?: Date;

  createdAt: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ status: 1, createdAt: 1 });
OutboxEventSchema.index({ eventType: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
