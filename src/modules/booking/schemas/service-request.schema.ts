import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestType, BookingStatus, GenderPreference, PaymentMethod } from '../../../common/enums';

export type ServiceRequestDocument = HydratedDocument<ServiceRequest>;

@Schema({ collection: 'service_requests', timestamps: true })
export class ServiceRequest {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Patient', index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service' })
  serviceId?: Types.ObjectId;

  @Prop({ required: true, enum: RequestType, default: RequestType.STANDARD })
  type: RequestType;

  @Prop({ required: true, enum: BookingStatus, default: BookingStatus.PENDING_OFFERS })
  status: BookingStatus;

  @Prop({ enum: GenderPreference })
  genderPreference?: GenderPreference;

  @Prop()
  notes?: string;

  @Prop({ maxlength: 300 })
  sosDescription?: string;

  @Prop({ required: true, type: Object })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop()
  scheduledFor?: Date;

  @Prop()
  broadcastAt?: Date;

  @Prop({ default: 60 })
  durationMinutes: number;

  @Prop({ enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  createdAt: Date;
  updatedAt: Date;
}

export const ServiceRequestSchema = SchemaFactory.createForClass(ServiceRequest);
ServiceRequestSchema.index({ location: '2dsphere' });
ServiceRequestSchema.index({ status: 1, type: 1 });
ServiceRequestSchema.index({ scheduledFor: 1, status: 1 });
