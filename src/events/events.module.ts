import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxProcessor } from './outbox.processor';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }])],
  providers: [OutboxProcessor],
  exports: [OutboxProcessor],
})
export class EventsModule {}
