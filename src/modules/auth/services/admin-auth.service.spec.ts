import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdminAuthService } from './admin-auth.service';
import { TokenService } from './token.service';
import { User } from '../../users/schemas/user.schema';
import { TempToken } from '../schemas/temp-token.schema';
import { UserType, UserStatus } from '../../../common/enums';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('otplib', () => ({
  OTP: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockResolvedValue({ valid: true }),
    generateSecret: jest.fn().mockReturnValue('mock_base32_secret'),
    generateURI: jest
      .fn()
      .mockReturnValue('otpauth://totp/Nabdh:admin@test.com?secret=mock_base32_secret'),
  })),
  NobleCryptoPlugin: jest.fn().mockImplementation(() => ({})),
  ScureBase32Plugin: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock_qr_data'),
}));

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let mockUserModel: any;
  let mockTempTokenModel: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockTokenService: any;

  const adminEmail = 'admin@nabdh.com';
  const adminPassword = 'password123';
  const adminId = 'admin_id_123';

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    mockTempTokenModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('admin_jwt_token'),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('Nabdh'),
    };

    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access_token'),
      createRefreshToken: jest.fn().mockResolvedValue('refresh_token'),
      findRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn().mockResolvedValue('new_refresh_token'),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(TempToken.name), useValue: mockTempTokenModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('throws ForbiddenException when admin has no totpSecret (2FA mandatory)', async () => {
      const mockUser = {
        _id: adminId,
        email: adminEmail,
        type: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed_password',
        totpSecret: null,
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.login(adminEmail, adminPassword)).rejects.toThrow(ForbiddenException);
    });

    it('returns requiresTwoFactor when 2FA is set up', async () => {
      const mockUser = {
        _id: adminId,
        email: adminEmail,
        type: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed_password',
        totpSecret: 'existing_secret',
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockTempTokenModel.create.mockResolvedValue({});

      const result = await service.login(adminEmail, adminPassword);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tempToken).toBeDefined();
      expect(mockTempTokenModel.create).toHaveBeenCalled();
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const mockUser = {
        _id: adminId,
        email: adminEmail,
        type: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed_password',
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.login(adminEmail, adminPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(adminEmail, adminPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no passwordHash', async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: adminId,
        email: adminEmail,
        type: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: null,
      });

      await expect(service.login(adminEmail, adminPassword)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyTwoFactor', () => {
    it('returns tokens when tempToken and TOTP code are valid', async () => {
      const mockTempToken = {
        _id: 'temp_token_id',
        userId: adminId,
        tokenHash: 'some_hash',
        isVerified: false,
      };
      mockTempTokenModel.findOne.mockResolvedValue(mockTempToken);

      const mockUser = {
        _id: adminId,
        email: adminEmail,
        type: UserType.ADMIN,
        totpSecret: 'existing_secret',
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.verifyTwoFactor('valid_temp_token', '123456');

      expect(mockTempTokenModel.findOne).toHaveBeenCalled();
      expect(mockTempTokenModel.deleteOne).toHaveBeenCalledWith({ _id: 'temp_token_id' });
      expect(mockTokenService.generateAccessToken).toHaveBeenCalled();
      expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(adminId);
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
    });

    it('throws UnauthorizedException when tempToken is invalid or expired', async () => {
      mockTempTokenModel.findOne.mockResolvedValue(null);

      await expect(service.verifyTwoFactor('invalid_token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user not found by tempToken', async () => {
      const mockTempToken = {
        _id: 'temp_token_id',
        userId: adminId,
        isVerified: false,
      };
      mockTempTokenModel.findOne.mockResolvedValue(mockTempToken);
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.verifyTwoFactor('valid_temp_token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user has no totpSecret', async () => {
      const mockTempToken = {
        _id: 'temp_token_id',
        userId: adminId,
        isVerified: false,
      };
      mockTempTokenModel.findOne.mockResolvedValue(mockTempToken);

      const mockUser = {
        _id: adminId,
        email: adminEmail,
        totpSecret: null,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(service.verifyTwoFactor('valid_temp_token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('setupTwoFactor', () => {
    it('generates secret and QR code when 2FA not set up', async () => {
      const mockUser = {
        _id: adminId,
        email: adminEmail,
        type: UserType.ADMIN,
        totpSecret: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.setupTwoFactor(adminId);

      expect(mockUserModel.findById).toHaveBeenCalledWith(adminId);
      expect(result.secret).toBe('mock_base32_secret');
      expect(result.qrCodeDataUrl).toBe('data:image/png;base64,mock_qr_data');
      expect(mockUser.totpSecret).toBe('mock_base32_secret');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('throws ConflictException when 2FA is already active', async () => {
      const mockUser = {
        _id: adminId,
        email: adminEmail,
        totpSecret: 'existing_secret',
        save: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(service.setupTwoFactor(adminId)).rejects.toThrow(ConflictException);
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.setupTwoFactor('nonexistent_id')).rejects.toThrow(NotFoundException);
    });

    it('activates 2FA when totpCode is provided and valid', async () => {
      const mockUser = {
        _id: adminId,
        email: adminEmail,
        totpSecret: 'existing_secret',
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.setupTwoFactor(adminId, '123456');

      expect(result.message).toBe('تم تفعيل المصادقة الثنائية');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when totpCode provided but no secret exists', async () => {
      const mockUser = {
        _id: adminId,
        email: adminEmail,
        totpSecret: null,
        save: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(service.setupTwoFactor(adminId, '123456')).rejects.toThrow(BadRequestException);
      expect(mockUser.save).not.toHaveBeenCalled();
    });
  });
});
