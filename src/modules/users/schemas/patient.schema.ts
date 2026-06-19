import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { Gender } from '../../../common/enums';

export type PatientDocument = HydratedDocument<Patient>;

@Schema({ collection: 'patients', timestamps: true })
export class Patient {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  fullName: string;

  @Prop({ enum: Gender })
  gender?: Gender;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  photoUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
