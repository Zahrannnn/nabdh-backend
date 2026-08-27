import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService, UPLOAD_KEY_PATTERN } from './upload.service';

describe('UploadService — key ownership', () => {
  let service: UploadService;

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

  beforeEach(async () => {
    service = new UploadService(configService as unknown as ConfigService);
    (service as any).bucket = 'test-bucket';
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
    });
  });

  describe('assertOwnedKey', () => {
    it('passes for the owner', () => {
      expect(() => service.assertOwnedKey('uploads/user-1/uuid-file.pdf', 'user-1')).not.toThrow();
    });

    it('throws BadRequest on malformed key', () => {
      expect(() => service.assertOwnedKey('not-a-key', 'user-1')).toThrow(BadRequestException);
      expect(() => service.assertOwnedKey('', 'user-1')).toThrow(BadRequestException);
      expect(() => service.assertOwnedKey(undefined as any, 'user-1')).toThrow(BadRequestException);
    });

    it('throws Forbidden when the key belongs to another user (IDOR)', () => {
      expect(() => service.assertOwnedKey('uploads/user-2/uuid-file.pdf', 'user-1')).toThrow(
        ForbiddenException,
      );
    });

    it('rejects prefix lookalikes (user-12 vs user-1)', () => {
      expect(() => service.assertOwnedKey('uploads/user-12/uuid-file.pdf', 'user-1')).toThrow(
        ForbiddenException,
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
