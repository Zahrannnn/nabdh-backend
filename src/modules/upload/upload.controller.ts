import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Invalid file type. Allowed: PDF, JPG, PNG'), false);
        }

        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadService.upload(file);
  }

  @Get('upload/signed-url')
  @ApiOperation({ summary: 'Get signed download URL' })
  async getSignedUrl(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('key query param required');
    }

    const url = await this.uploadService.getSignedUrl(key);

    return {
      url,
      expiresIn: 900,
    };
  }
}
