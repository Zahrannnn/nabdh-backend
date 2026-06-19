import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type RatingDocument = HydratedDocument<Rating>;

@Schema({ collection: 'ratings', timestamps: true })
export class Rating {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Booking', unique: true, index: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  raterId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  rateeId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop()
  reviewText?: string;

  @Prop()
  editableUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);
