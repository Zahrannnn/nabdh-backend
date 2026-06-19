import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ collection: 'chat_messages', timestamps: { createdAt: true, updatedAt: false } })
export class ChatMessage {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Booking', index: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isDelivered: boolean;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  deliveredAt?: Date;

  createdAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ bookingId: 1, createdAt: 1 });
