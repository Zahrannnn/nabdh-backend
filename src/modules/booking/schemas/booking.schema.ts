import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { BookingStatus } from '../../../common/enums';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ collection: 'bookings', timestamps: true })
export class Booking {
  @Prop({ required: true, type: Types.ObjectId, ref: 'ServiceRequest', unique: true, index: true })
  requestId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Patient', index: true })
  patientId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Nurse', index: true })
  nurseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Offer' })
  offerId?: Types.ObjectId;

  @Prop({ required: true, enum: BookingStatus })
  status: BookingStatus;

  @Prop()
  enRouteAt?: Date;

  @Prop()
  arrivedAt?: Date;

  @Prop()
  visitStartedAt?: Date;

  @Prop()
  visitCompletedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop()
  cancelledBy?: string;

  @Prop({ type: Types.ObjectId, ref: 'Rating' })
  ratingId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ nurseId: 1, status: 1 });
BookingSchema.index({ patientId: 1, status: 1 });
