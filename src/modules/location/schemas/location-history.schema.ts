import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type LocationHistoryDocument = HydratedDocument<LocationHistory>;

@Schema({ collection: 'location_history', timestamps: { createdAt: true, updatedAt: false } })
export class LocationHistory {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Nurse', index: true })
  nurseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop()
  speed?: number;

  createdAt: Date;
}

export const LocationHistorySchema = SchemaFactory.createForClass(LocationHistory);
LocationHistorySchema.index({ nurseId: 1, createdAt: -1 });
LocationHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 });
