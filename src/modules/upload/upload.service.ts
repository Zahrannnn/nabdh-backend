import { BadRequestException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
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

/** Owner-scoped key layout: uploads/<ownerUserId>/<uuid>-<safeName> */
export const UPLOAD_KEY_PATTERN = /^uploads\/(?!\.+$)(?!\.)([^/]+)\/([^/]+)$/;

@Injectable()
export class UploadService implements OnModuleInit {
  /** Single source of truth for presigned URL lifetime (seconds). */
  static readonly SIGNED_URL_TTL_SECONDS = 900;

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

  /**
   * Ensures `key` is syntactically valid AND belongs to `ownerUserId`.
   * Throws BadRequest/Forbidden — call before any signed-URL or delete operation.
   */
  assertOwnedKey(key: string, ownerUserId: string): void {
    const match = UPLOAD_KEY_PATTERN.exec(key ?? '');

    if (!match) {
      throw new BadRequestException('Invalid key format. Expected: uploads/<userId>/<fileName>');
    }

    if (match[1] !== ownerUserId) {
      throw new ForbiddenException('You do not have access to this upload');
    }
  }

  /** Strips any path components / unsafe characters from the client-supplied filename. */
  private static sanitizeFilename(name: string): string {
    const base = (name ?? '').split(/[\\/]/).pop() ?? 'file';
    const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_');

    return cleaned.length > 0 ? cleaned.slice(-100) : 'file';
  }

  static buildKey(ownerUserId: string, originalName: string): string {
    return `uploads/${ownerUserId}/${randomUUID()}-${UploadService.sanitizeFilename(originalName)}`;
  }

  async upload(file: Express.Multer.File, ownerUserId: string) {
    try {
      const key = UploadService.buildKey(ownerUserId, file.originalname);

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentDisposition: 'attachment',
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
        expiresIn: UploadService.SIGNED_URL_TTL_SECONDS, // 15 minutes
      },
    );
  }
}
