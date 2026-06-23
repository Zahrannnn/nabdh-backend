import {
  Injectable,
  Logger,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { User, UserDocument } from './schemas/user.schema';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { UserType } from '../../common/enums';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).lean() as Promise<UserDocument | null>;
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).lean() as Promise<UserDocument | null>;
  }

  async createPatientProfile(currentUser: any, dto: CreatePatientDto) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can create a patient profile');
    }
    const existingPatient = await this.patientModel.findOne({
      userId: currentUser.userId,
    });

    if (existingPatient) {
      throw new ConflictException('Patient profile already exists');
    }
    const patient = await this.patientModel.create({
      userId: currentUser.userId,
      fullName: dto.fullName,
      gender: dto.gender,
    });
    return patient;
  }

  async getPatientProfile(currentUser: any) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can view a patient profile');
    }
    const patient = await this.patientModel.findOne({
      userId: currentUser.userId,
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return patient;
  }

  async updatePatientProfile(currentUser: any, dto: UpdatePatientDto) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can update a patient profile');
    }

    const patient = await this.patientModel.findOne({
      userId: currentUser.userId,
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    const updatedPatient = await this.patientModel.findOneAndUpdate(
      { userId: currentUser.userId },
      dto,
      { new: true },
    );

    return updatedPatient;
  }

  async getNurseProfile() {
    return { id: 'mock-nurse-id', firstName: 'Jane', lastName: 'Nurse' };
  }
}
