import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { Nurse, NurseSchema } from './schemas/nurse.schema';
import { Address, AddressSchema } from './schemas/address.schema';
import { NurseDocument, NurseDocumentSchema } from './schemas/nurse-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Nurse.name, schema: NurseSchema },
      { name: Address.name, schema: AddressSchema },
      { name: NurseDocument.name, schema: NurseDocumentSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
