import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Owner-scoped key layout: uploads/<ownerUserId>/<uuid>-<safeName>
 * `(?!\\.)` rejects `.` / `..` traversal segments in the owner position.
 */
export const UPLOAD_KEY_PATTERN = /^uploads\/(?!\.)([^/]+)\/([^/]+)$/;

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
   * Ensures `key` is syntactically valid AND accessible by `ownerUserId`.
   *
   * Keys in the current `uploads/<userId>/...` layout are only accessible to
   * their owner. Legacy keys (pre-owner-scoping, arbitrary layout, may even
   * lack the `uploads/` prefix) are accepted **only if the object actually
   * exists in the bucket** — so random strings get 400, existing legacy
   * objects keep working until migrated.
   */
  async assertCanAccess(key: string, ownerUserId: string): Promise<void> {
    const match = UPLOAD_KEY_PATTERN.exec(key ?? '');

    if (!match) {
      // Not owner-scoped layout: allow only if it is an existing legacy object.
      if (await this.objectExists(key)) {
        return;
      }

      throw new BadRequestException('Invalid key format. Expected: uploads/<userId>/<fileName>');
    }

    if (match[1] !== ownerUserId) {
      throw new ForbiddenException('You do not have access to this upload');
    }
  }

  /** HeadObject probe — true only if the object exists in the bucket. */
  async objectExists(key: string): Promise<boolean> {
    if (!key) {
      return false;
    }

    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));

      return true;
    } catch {
      return false;
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
