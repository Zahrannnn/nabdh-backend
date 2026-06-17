import { Injectable, Logger } from '@nestjs/common';
import { CreatePatientDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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
