import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Put,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  CreateAddressDto,
  CreateNurseDto,
  UpdateNurseDto,
  CreateNurseDocumentDto,
  UpdateNurseAvailabilityDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '@common/decorators';
import { UserType } from '@common/enums';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('patient/profile')
  @Roles(UserType.PATIENT)
  @ApiOperation({ summary: 'Create patient profile' })
  async createPatientProfile(@CurrentUser() currentUser: any, @Body() dto: CreatePatientDto) {
    return this.usersService.createPatientProfile(currentUser, dto);
  }

  @Get('patient/profile')
  @Roles(UserType.PATIENT)
  @ApiOperation({ summary: 'Get patient profile' })
  async getPatientProfile(@CurrentUser() currentUser: any) {
    return this.usersService.getPatientProfile(currentUser);
  }

  @Put('patient/profile')
  @Roles(UserType.PATIENT)
  @ApiOperation({ summary: 'Update patient profile' })
  async updatePatientProfile(@CurrentUser() currentUser: any, @Body() dto: UpdatePatientDto) {
    return this.usersService.updatePatientProfile(currentUser, dto);
  }

  @Post('patient/addresses')
  @Roles(UserType.PATIENT)
  @ApiOperation({ summary: 'Create patient address' })
  async createPatientAddress(@CurrentUser() currentUser: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createPatientAddress(currentUser, dto);
  }

  @Get('patient/addresses')
  @Roles(UserType.PATIENT)
  @ApiOperation({ summary: 'Get patient addresses' })
  async getPatientAddresses(@CurrentUser() currentUser: any) {
    return this.usersService.getPatientAddresses(currentUser);
  }

  @Delete('patient/addresses/:id')
  @Roles(UserType.PATIENT)
  @ApiOperation({ summary: 'Delete patient address' })
  async deletePatientAddress(@CurrentUser() currentUser: any, @Param('id') addressId: string) {
    return this.usersService.deletePatientAddress(currentUser, addressId);
  }

  @Post('nurse/profile')
  @Roles(UserType.NURSE)
  @ApiOperation({ summary: 'Create nurse profile' })
  async createNurseProfile(@CurrentUser() currentUser: any, @Body() dto: CreateNurseDto) {
    return this.usersService.createNurseProfile(currentUser, dto);
  }

  @Get('nurse/profile')
  @Roles(UserType.NURSE)
  @ApiOperation({ summary: 'Get nurse profile' })
  async getNurseProfile(@CurrentUser() currentUser: any) {
    return this.usersService.getNurseProfile(currentUser);
  }

  @Put('nurse/profile')
  @Roles(UserType.NURSE)
  @ApiOperation({ summary: 'Update nurse profile' })
  async updateNurseProfile(@CurrentUser() currentUser: any, @Body() dto: UpdateNurseDto) {
    return this.usersService.updateNurseProfile(currentUser, dto);
  }

  @ApiOperation({ summary: 'Upload nurse document' })
  @Roles(UserType.NURSE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['NATIONAL_ID', 'NURSING_LICENSE', 'PROFILE_PHOTO'],
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['type', 'file'],
    },
  })
  @Post('nurse/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNurseDocument(
    @CurrentUser() currentUser: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|pdf)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: CreateNurseDocumentDto,
  ) {
    return this.usersService.uploadNurseDocument(currentUser, file, dto);
  }

  @Get('nurse/documents')
  @Roles(UserType.NURSE)
  @ApiOperation({ summary: 'Get nurse documents' })
  async getNurseDocuments(@CurrentUser() currentUser: any) {
    return this.usersService.getNurseDocuments(currentUser);
  }

  @Delete('nurse/documents/:id')
  @Roles(UserType.NURSE)
  @ApiOperation({ summary: 'Delete nurse document' })
  async deleteNurseDocument(@CurrentUser() currentUser: any, @Param('id') documentId: string) {
    return this.usersService.deleteNurseDocument(currentUser, documentId);
  }

  @Patch('nurse/availability')
  @Roles(UserType.NURSE)
  @ApiOperation({ summary: 'Update nurse availability' })
  async updateNurseAvailability(
    @CurrentUser() currentUser: any,
    @Body() dto: UpdateNurseAvailabilityDto,
  ) {
    return this.usersService.updateNurseAvailability(currentUser, dto);
  }

  @Get('nurses/:id')
  @ApiOperation({ summary: 'Get public nurse profile' })
  async getPublicNurseProfile(@Param('id') nurseId: string) {
    return this.usersService.getPublicNurseProfile(nurseId);
  }
}
