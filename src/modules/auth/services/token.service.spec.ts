import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TokenService } from './token.service';
import { RefreshToken } from '../schemas/refresh-token.schema';

describe('TokenService', () => {
  let service: TokenService;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockRefreshTokenModel: any;

  const mockUserId = 'user_123';

  beforeEach(async () => {
    mockJwtService = {
      sign: jest.fn().mockReturnValue('access_jwt_token'),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('15m') as any,
    };

    mockRefreshTokenModel = {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(RefreshToken.name), useValue: mockRefreshTokenModel },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('calls jwtService.sign with correct payload and returns token', () => {
      const user = { _id: mockUserId, phone: '+201234567890', type: 'PATIENT' };

      const result = service.generateAccessToken(user as any);

      expect(result).toBe('access_jwt_token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUserId, phone: '+201234567890', type: 'PATIENT' },
        { expiresIn: '15m' },
      );
    });

    it('uses JWT_ACCESS_EXPIRY from config', () => {
      (mockConfigService.get as jest.Mock).mockReturnValueOnce('30m');

      const user = { _id: mockUserId, phone: '+201234567890', type: 'NURSE' };
      service.generateAccessToken(user as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Object), { expiresIn: '30m' });
    });
  });

  describe('createRefreshToken', () => {
    it('generates a random token, hashes it, saves to DB, returns raw token', async () => {
      let savedDoc: any;
      mockRefreshTokenModel.create.mockImplementation((doc: any) => {
        savedDoc = doc;
        return Promise.resolve(doc);
      });

      const rawToken = await service.createRefreshToken(mockUserId);

      expect(rawToken).toBeDefined();
      expect(typeof rawToken).toBe('string');
      expect(rawToken.length).toBe(80);

      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(savedDoc.tokenHash).toBe(expectedHash);
      expect(savedDoc.userId).toBe(mockUserId);
      expect(savedDoc.expiresAt).toBeInstanceOf(Date);
      expect(mockRefreshTokenModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findRefreshToken', () => {
    it('returns document when token is valid', async () => {
      const rawToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const mockDoc = {
        tokenHash,
        userId: mockUserId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockRefreshTokenModel.findOne.mockResolvedValue(mockDoc);

      const result = await service.findRefreshToken(rawToken);

      expect(result).toBe(mockDoc);
      expect(mockRefreshTokenModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash, isRevoked: false }),
      );
    });

    it('returns null when token is revoked or expired', async () => {
      mockRefreshTokenModel.findOne.mockResolvedValue(null);

      const result = await service.findRefreshToken('invalid_or_expired_token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('updates the token to revoked in database', async () => {
      const rawToken = 'some_raw_token';

      await service.revokeRefreshToken(rawToken);

      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(mockRefreshTokenModel.updateOne).toHaveBeenCalledWith(
        { tokenHash: expectedHash },
        { $set: { revokedAt: expect.any(Date), isRevoked: true } },
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('revokes old token and creates a new one', async () => {
      const oldRawToken = 'old_raw_token';
      let newSavedDoc: any;
      mockRefreshTokenModel.create.mockImplementation((doc: any) => {
        newSavedDoc = doc;
        return Promise.resolve(doc);
      });

      const result = await service.rotateRefreshToken(oldRawToken, mockUserId);

      const oldHash = crypto.createHash('sha256').update(oldRawToken).digest('hex');
      expect(mockRefreshTokenModel.updateOne).toHaveBeenCalledWith(
        { tokenHash: oldHash },
        { $set: { revokedAt: expect.any(Date), isRevoked: true } },
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(80);
      const newHash = crypto.createHash('sha256').update(result).digest('hex');
      expect(newSavedDoc.tokenHash).toBe(newHash);
      expect(newSavedDoc.userId).toBe(mockUserId);
    });
  });
});
