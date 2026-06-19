import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { OfferStatus } from '../../../common/enums';

export type OfferDocument = HydratedDocument<Offer>;

@Schema({ collection: 'offers', timestamps: true })
export class Offer {
  @Prop({ required: true, type: Types.ObjectId, ref: 'ServiceRequest', index: true })
  requestId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Nurse', index: true })
  nurseId: Types.ObjectId;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  etaMinutes: number;

  @Prop({ enum: OfferStatus, default: OfferStatus.PENDING })
  status: OfferStatus;

  @Prop()
  relevanceScore?: number;

  createdAt: Date;
  updatedAt: Date;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
OfferSchema.index({ requestId: 1, nurseId: 1 }, { unique: true });
