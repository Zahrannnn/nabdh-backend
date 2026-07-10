import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';

export type AddressDocument = HydratedDocument<Address>;
@Schema({ collection: 'addresses', timestamps: true })
export class Address {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Patient',
    index: true,
  })
  patientId: Types.ObjectId;

  @Prop()
  label?: string;

  @Prop({ required: true, type: Object })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop()
  details?: string;

  createdAt: Date;
  updatedAt: Date;
}
export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.index({ location: '2dsphere' });
