import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OtpSessionDocument = HydratedDocument<OtpSession>;

@Schema({ collection: 'otp_sessions', timestamps: { createdAt: true, updatedAt: false } })
export class OtpSession {
  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true })
  codeHash: string;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  isUsed: boolean;

  createdAt: Date;
}

export const OtpSessionSchema = SchemaFactory.createForClass(OtpSession);
