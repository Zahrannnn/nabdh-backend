import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';

export type TempTokenDocument = HydratedDocument<TempToken>;

@Schema({ collection: 'temp_tokens', timestamps: true })
export class TempToken {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TempTokenSchema = SchemaFactory.createForClass(TempToken);

TempTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
