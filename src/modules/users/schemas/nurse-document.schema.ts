import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { DocumentType, VerificationStatus } from '../../../common/enums';

export type NurseDocumentDoc = HydratedDocument<NurseDocument>;

@Schema({ collection: 'nurse_documents', timestamps: true })
export class NurseDocument {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Nurse', index: true })
  nurseId: Types.ObjectId;

  @Prop({ required: true, enum: DocumentType })
  type: DocumentType;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({
    required: true,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const NurseDocumentSchema = SchemaFactory.createForClass(NurseDocument);
