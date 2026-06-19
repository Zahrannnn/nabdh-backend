import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { DocumentType } from '../../../common/enums';

export type NurseDocumentDoc = HydratedDocument<NurseDocument>;

@Schema({ collection: 'nurse_documents', timestamps: true })
export class NurseDocument {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Nurse', index: true })
  nurseId: Types.ObjectId;

  @Prop({ required: true, enum: DocumentType })
  type: DocumentType;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const NurseDocumentSchema = SchemaFactory.createForClass(NurseDocument);
