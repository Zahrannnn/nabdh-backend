import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service>;

@Schema({ collection: 'services', timestamps: true })
export class Service {
  @Prop({ required: true })
  nameAr: string;

  @Prop()
  descriptionAr?: string;

  @Prop()
  icon?: string;

  @Prop({ required: true })
  basePriceMin: number;

  @Prop({ required: true })
  basePriceMax: number;

  @Prop({ default: 60 })
  durationMinutes: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0.18 })
  commissionRate: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
