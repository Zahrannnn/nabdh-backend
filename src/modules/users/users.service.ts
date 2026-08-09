import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreatePatientDto,
  UpdatePatientDto,
  CreateAddressDto,
  CreateNurseDto,
  UpdateNurseDto,
  CreateNurseDocumentDto,
  UpdateNurseAvailabilityDto,
} from './dto';
import { User, UserDocument } from './schemas/user.schema';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { UserType, VerificationStatus } from '../../common/enums';
import { Address, AddressDocument } from './schemas/address.schema';
import { Nurse, NurseDocument } from './schemas/nurse.schema';
import {
  NurseDocument as NurseDocumentEntity,
  NurseDocumentDoc,
} from './schemas/nurse-document.schema';
import { UploadService } from '../upload/upload.service';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
    @InjectModel(Nurse.name)
    private readonly nurseModel: Model<NurseDocument>,
    @InjectModel(NurseDocumentEntity.name)
    private readonly nurseDocumentModel: Model<NurseDocumentDoc>,
    private readonly uploadService: UploadService,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).lean() as Promise<UserDocument | null>;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).lean() as Promise<UserDocument | null>;
  }

  async createPatientProfile(currentUser: any, dto: CreatePatientDto) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can create a patient profile');
    }
    const patient = await this.patientModel.findOneAndUpdate(
      { userId: currentUser.userId },
      {
        fullName: dto.fullName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        photoUrl: dto.photoUrl,
      },
      { upsert: true, new: true, omitUndefined: true },
    );
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

  async createPatientAddress(currentUser: any, dto: CreateAddressDto) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can create an address');
    }

    const patient = await this.patientModel.findOne({
      userId: currentUser.userId,
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    const address = await this.addressModel.create({
      patientId: patient._id,
      label: dto.label,
      details: dto.details,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
    });
    return address;
  }

  async getPatientAddresses(currentUser: any) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can view addresses');
    }
    const patient = await this.patientModel.findOne({
      userId: currentUser.userId,
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    const addresses = await this.addressModel.find({
      patientId: patient._id,
    });

    return addresses;
  }

  async deletePatientAddress(currentUser: any, addressId: string) {
    if (currentUser.type !== UserType.PATIENT) {
      throw new ForbiddenException('Only patients can delete addresses');
    }

    const patient = await this.patientModel.findOne({
      userId: currentUser.userId,
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    const address = await this.addressModel.findOneAndDelete({
      _id: addressId,
      patientId: patient._id,
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return {
      message: 'Address deleted successfully',
    };
  }

  async createNurseProfile(currentUser: any, dto: CreateNurseDto) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can create a nurse profile');
    }

    const nurse = await this.nurseModel.findOneAndUpdate(
      { userId: currentUser.userId },
      {
        fullName: dto.fullName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        licenseNumber: dto.licenseNumber,
        licenseExpiryDate: dto.licenseExpiryDate,
        yearsOfExperience: dto.yearsOfExperience,
        bio: dto.bio,
        hourlyRate: dto.hourlyRate,
        verificationStatus: VerificationStatus.INCOMPLETE,
      },
      { upsert: true, new: true, omitUndefined: true },
    );

    return nurse;
  }

  async getNurseProfile(currentUser: any) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can view their profile');
    }

    const nurse = await this.nurseModel.findOne({
      userId: currentUser.userId,
    });

    if (!nurse) {
      throw new NotFoundException('Nurse profile not found');
    }

    return nurse;
  }

  async updateNurseProfile(currentUser: any, dto: UpdateNurseDto) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can update a Nurse profile');
    }

    const nurse = await this.nurseModel.findOne({
      userId: currentUser.userId,
    });

    if (!nurse) {
      throw new NotFoundException('nurse profile not found');
    }
    const updatedNurse = await this.nurseModel.findOneAndUpdate(
      { userId: currentUser.userId },
      dto,
      { new: true },
    );

    return updatedNurse;
  }

  async uploadNurseDocument(
    currentUser: any,
    file: Express.Multer.File,
    dto: CreateNurseDocumentDto,
  ) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can upload documents');
    }

    const nurse = await this.nurseModel.findOne({
      userId: currentUser.userId,
    });

    if (!nurse) {
      throw new NotFoundException('Nurse profile not found');
    }

    const uploaded = await this.uploadService.upload(file);

    const document = await this.nurseDocumentModel.create({
      nurseId: nurse._id,
      type: dto.type,
      url: uploaded.url,
      key: uploaded.key,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      status: VerificationStatus.PENDING,
    });

    return document;
  }

  async getNurseDocuments(currentUser: any) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can view their documents');
    }
    const nurse = await this.nurseModel.findOne({
      userId: currentUser.userId,
    });

    if (!nurse) {
      throw new NotFoundException('Nurse profile not found');
    }
    const documents = await this.nurseDocumentModel.find({
      nurseId: nurse._id,
    });

    return documents;
  }

  async deleteNurseDocument(currentUser: any, documentId: string) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can delete their documents');
    }

    const nurse = await this.nurseModel.findOne({
      userId: currentUser.userId,
    });

    if (!nurse) {
      throw new NotFoundException('Nurse profile not found');
    }

    const document = await this.nurseDocumentModel.findOneAndDelete({
      _id: documentId,
      nurseId: nurse._id,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.uploadService.delete(document.key);
    await this.nurseDocumentModel.deleteOne({
      _id: documentId,
    });
    return {
      message: 'Document deleted successfully',
    };
  }

  async updateNurseAvailability(currentUser: any, dto: UpdateNurseAvailabilityDto) {
    if (currentUser.type !== UserType.NURSE) {
      throw new ForbiddenException('Only nurses can update availability');
    }
    const nurse = await this.nurseModel.findOne({
      userId: currentUser.userId,
    });

    if (!nurse) {
      throw new NotFoundException('Nurse profile not found');
    }

    if (dto.isOnline) {
      if (nurse.verificationStatus !== VerificationStatus.APPROVED) {
        throw new BadRequestException('Your account must be approved before going online');
      }
      if (nurse.licenseExpiryDate && nurse.licenseExpiryDate <= new Date()) {
        throw new BadRequestException('Your nursing license has expired');
      }
      const minBalance = Number(process.env.NURSE_MIN_PREPAID_BALANCE ?? 100);

      if (nurse.prepaidBalance < minBalance) {
        throw new BadRequestException(`Minimum prepaid balance is ${minBalance}`);
      }
    }
    this.logger.warn('TODO: Active booking check will be implemented in Sprint 2');

    nurse.isOnline = dto.isOnline;
    await nurse.save();
    return nurse;
  }

  async getPublicNurseProfile(nurseId: string) {
    const nurse = await this.nurseModel
      .findById(nurseId)
      .select(
        'fullName photoUrl gender avgRating totalRatings yearsOfExperience bio hourlyRate -_id',
      );
    if (!nurse) {
      throw new NotFoundException('Nurse not found');
    }

    return nurse;
  }
}
