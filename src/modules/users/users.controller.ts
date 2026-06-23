import { Controller, Get, Post, Body, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';
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

  @Get('nurse/profile')
  @ApiOperation({ summary: 'Get nurse profile' })
  async getNurseProfile() {
    return this.usersService.getNurseProfile();
  }
}
