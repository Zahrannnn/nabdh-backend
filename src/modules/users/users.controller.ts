import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreatePatientDto } from './dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('patient/profile')
  @ApiOperation({ summary: 'Create or update patient profile' })
  async createPatientProfile(@Body() dto: CreatePatientDto) {
    return this.usersService.createPatientProfile(dto);
  }

  @Get('patient/profile')
  @ApiOperation({ summary: 'Get patient profile' })
  async getPatientProfile() {
    return this.usersService.getPatientProfile();
  }

  @Get('nurse/profile')
  @ApiOperation({ summary: 'Get nurse profile' })
  async getNurseProfile() {
    return this.usersService.getNurseProfile();
  }
}
