import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { WalletTransactionType } from '../../../common/enums';

export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

@Schema({ collection: 'wallet_transactions', timestamps: true })
export class WalletTransaction {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Wallet', index: true })
  walletId: Types.ObjectId;

  @Prop({ required: true, enum: WalletTransactionType })
  type: WalletTransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  balanceBefore: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop()
  referenceType?: string;

  @Prop()
  referenceId?: string;

  @Prop()
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
