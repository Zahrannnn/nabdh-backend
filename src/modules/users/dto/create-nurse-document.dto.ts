import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DocumentType } from '../../../common/enums';

export class CreateNurseDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.NATIONAL_ID,
  })
  @IsEnum(DocumentType)
  type: DocumentType;
}
