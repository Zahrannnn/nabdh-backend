import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePatientDto } from './dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).lean() as Promise<UserDocument | null>;
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).lean() as Promise<UserDocument | null>;
  }

  async createPatientProfile(dto: CreatePatientDto) {
    this.logger.log(`Stub: Patient profile created for ${dto.firstName} ${dto.lastName}`);
    return { id: 'mock-patient-id', ...dto };
  }

  async getPatientProfile() {
    return { id: 'mock-patient-id', firstName: 'John', lastName: 'Doe' };
  }

  async getNurseProfile() {
    return { id: 'mock-nurse-id', firstName: 'Jane', lastName: 'Nurse' };
  }
}
