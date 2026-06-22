import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { Gender, VerificationStatus } from '../../../common/enums';

export type NurseDocument = HydratedDocument<Nurse>;

@Schema({ collection: 'nurses', timestamps: true })
export class Nurse {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ default: '' })
  fullName: string;

  @Prop({ enum: Gender })
  gender?: Gender;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  photoUrl?: string;

  @Prop({ required: true, unique: true })
  licenseNumber: string;

  @Prop({ required: true })
  licenseExpiryDate: Date;

  @Prop({ default: 0 })
  yearsOfExperience: number;

  @Prop()
  bio?: string;

  @Prop({ default: 0 })
  hourlyRate: number;

  @Prop({ enum: VerificationStatus, default: VerificationStatus.INCOMPLETE })
  verificationStatus: VerificationStatus;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  verificationSlaDeadline?: Date;

  @Prop({ default: 0 })
  avgRating: number;

  @Prop({ default: 0 })
  totalRatings: number;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ type: Object })
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ default: 0 })
  prepaidBalance: number;

  createdAt: Date;
  updatedAt: Date;
}

export const NurseSchema = SchemaFactory.createForClass(Nurse);
NurseSchema.index({ location: '2dsphere' });
NurseSchema.index({ verificationStatus: 1, isOnline: 1 });
