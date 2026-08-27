import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService, UPLOAD_KEY_PATTERN } from './upload.service';

describe('UploadService — key access control', () => {
  let service: UploadService;

  /** What HeadObjectCommand probes return true for (simulates existing objects). */
  let existingKeys: Set<string>;

  const client = { send: jest.fn() };

  const configService = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        S3_BUCKET: 'test-bucket',
        S3_REGION: 'us-east-1',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_ACCESS_KEY: 'test',
        S3_SECRET_KEY: 'test',
      };
      return map[k];
    }),
  };

  beforeEach(() => {
    existingKeys = new Set<string>(['legacy/nurse-doc.pdf']);

    client.send.mockImplementation(
      (command: { constructor: { name: string }; input: { Key?: string } }) => {
        if (command.constructor.name === 'HeadObjectCommand') {
          if (existingKeys.has(command.input.Key ?? '')) {
            return Promise.resolve({});
          }

          return Promise.reject(new Error('NotFound'));
        }

        return Promise.resolve({});
      },
    );

    service = new UploadService(configService as unknown as ConfigService);
    (service as unknown as { client: unknown }).client = client;
    (service as unknown as { bucket: string }).bucket = 'test-bucket';
  });

  describe('UPLOAD_KEY_PATTERN', () => {
    it('accepts a well-formed owner-scoped key', () => {
      expect(UPLOAD_KEY_PATTERN.exec('uploads/user-1/uuid-report.pdf')).toBeTruthy();
    });

    it('rejects keys outside uploads/', () => {
      expect(UPLOAD_KEY_PATTERN.exec('other/user-1/file.pdf')).toBeFalsy();
    });

    it('rejects keys with extra path segments', () => {
      expect(UPLOAD_KEY_PATTERN.exec('uploads/user-1/sub/dir/file.pdf')).toBeFalsy();
    });

    it('rejects traversal attempts', () => {
      expect(UPLOAD_KEY_PATTERN.exec('uploads/../secret.pdf')).toBeFalsy();
      expect(UPLOAD_KEY_PATTERN.exec('uploads/./secret.pdf')).toBeFalsy();
    });
  });

  describe('assertCanAccess', () => {
    it('passes for the owner', async () => {
      await expect(
        service.assertCanAccess('uploads/user-1/uuid-file.pdf', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('throws Forbidden when the key belongs to another user (IDOR)', async () => {
      await expect(
        service.assertCanAccess('uploads/user-2/uuid-file.pdf', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects prefix lookalikes (user-12 vs user-1)', async () => {
      await expect(
        service.assertCanAccess('uploads/user-12/uuid-file.pdf', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequest on non-existent non-scoped key (random strings still 400)', async () => {
      await expect(service.assertCanAccess('some/random/guess.pdf', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows legacy keys that actually exist in the bucket', async () => {
      await expect(
        service.assertCanAccess('legacy/nurse-doc.pdf', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('treats empty/undefined keys as BadRequest', async () => {
      await expect(service.assertCanAccess('', 'user-1')).rejects.toThrow(BadRequestException);
      await expect(service.assertCanAccess(undefined as never, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('buildKey', () => {
    it('scopes the key to the owner and sanitizes the filename', () => {
      const key = UploadService.buildKey('user-1', '../../etc/passwd');
      expect(key).toMatch(/^uploads\/user-1\/[0-9a-f-]+-passwd$/);
    });

    it('strips path separators from the filename', () => {
      const key = UploadService.buildKey('user-1', 'a/b/c\\img.png');
      expect(key.startsWith('uploads/user-1/')).toBe(true);
      // exactly uploads/<owner>/<file> — no extra segments
      expect(key.split('/')).toHaveLength(3);
      expect(key.endsWith('-img.png')).toBe(true);
    });

    it('keeps safe characters intact', () => {
      const key = UploadService.buildKey('user-1', 'Report_2026-08-27 v2.pdf');
      expect(key).toMatch(/^uploads\/user-1\/[0-9a-f-]{36}-Report_2026-08-27_v2\.pdf$/);
    });
  });
});
