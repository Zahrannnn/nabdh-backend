import { Controller, Get, Post, Body, UseGuards, Put, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  CreateAddressDto,
  CreateNurseDto,
  UpdateNurseDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('patient/profile')
  @ApiOperation({ summary: 'Create patient profile' })
  async createPatientProfile(@CurrentUser() currentUser: any, @Body() dto: CreatePatientDto) {
    return this.usersService.createPatientProfile(currentUser, dto);
  }

  @Get('patient/profile')
  @ApiOperation({ summary: 'Get patient profile' })
  async getPatientProfile(@CurrentUser() currentUser: any) {
    return this.usersService.getPatientProfile(currentUser);
  }

  @Put('patient/profile')
  @ApiOperation({ summary: 'Update patient profile' })
  async updatePatientProfile(@CurrentUser() currentUser: any, @Body() dto: UpdatePatientDto) {
    return this.usersService.updatePatientProfile(currentUser, dto);
  }

  @Post('patient/addresses')
  @ApiOperation({ summary: 'Create patient address' })
  async createPatientAddress(@CurrentUser() currentUser: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createPatientAddress(currentUser, dto);
  }

  @Get('patient/addresses')
  @ApiOperation({ summary: 'Get patient addresses' })
  async getPatientAddresses(@CurrentUser() currentUser: any) {
    return this.usersService.getPatientAddresses(currentUser);
  }

  @Delete('patient/addresses/:id')
  @ApiOperation({ summary: 'Delete patient address' })
  async deletePatientAddress(@CurrentUser() currentUser: any, @Param('id') addressId: string) {
    return this.usersService.deletePatientAddress(currentUser, addressId);
  }

  @Post('nurse/profile')
  @ApiOperation({ summary: 'Create nurse profile' })
  async createNurseProfile(@CurrentUser() currentUser: any, @Body() dto: CreateNurseDto) {
    return this.usersService.createNurseProfile(currentUser, dto);
  }

  @Get('nurse/profile')
  @ApiOperation({ summary: 'Get nurse profile' })
  async getNurseProfile(@CurrentUser() currentUser: any) {
    return this.usersService.getNurseProfile(currentUser);
  }

  @Put('nurse/profile')
  @ApiOperation({ summary: 'Update nurse profile' })
  async updateNurseProfile(@CurrentUser() currentUser: any, @Body() dto: UpdateNurseDto) {
    return this.usersService.updateNurseProfile(currentUser, dto);
  }
}
