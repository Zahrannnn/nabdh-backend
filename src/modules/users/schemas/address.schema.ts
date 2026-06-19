import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ collection: 'addresses', timestamps: true })
export class Address {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop()
  label?: string;

  @Prop({ required: true })
  governorate: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  street: string;

  @Prop()
  building?: string;

  @Prop()
  apartment?: string;

  @Prop({ required: true, type: Object })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.index({ location: '2dsphere' });
