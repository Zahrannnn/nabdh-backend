import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService implements OnModuleInit {
  private client: S3Client;

  private bucket: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.configService.get<string>('S3_BUCKET')!;

    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION'),
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY')!,
      },
    });

    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );
    } catch {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
        }),
      );
    }
  }

  async upload(file: Express.Multer.File) {
    try {
      const key = `${randomUUID()}-${file.originalname}`;

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const endpoint = this.configService.get<string>('S3_ENDPOINT');

      return {
        url: `${endpoint}/${this.bucket}/${key}`,
        key,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      {
        expiresIn: 900, // 15 minutes
      },
    );
  }
}
