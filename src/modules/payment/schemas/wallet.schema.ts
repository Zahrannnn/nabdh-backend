import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ collection: 'wallets', timestamps: true })
export class Wallet {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Nurse', unique: true, index: true })
  nurseId: Types.ObjectId;

  @Prop({ default: 0 })
  availableBalance: number;

  @Prop({ default: 0 })
  prepaidBalance: number;

  @Prop({ default: 0 })
  pendingBalance: number;

  @Prop({ default: 0 })
  totalEarned: number;

  @Prop({ default: 0 })
  totalCommission: number;

  createdAt: Date;
  updatedAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
