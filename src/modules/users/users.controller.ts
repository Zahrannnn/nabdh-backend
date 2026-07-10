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
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @ApiOperation({ summary: 'Upload nurse document' })
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
}
