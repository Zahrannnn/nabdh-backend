import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { EmailProvider } from './providers/email.provider';
import { User } from '../users/schemas/user.schema';
import { OtpSession } from './schemas/otp-session.schema';
import { RefreshToken } from './schemas/refresh-token.schema';
import { Patient } from '../users/schemas/patient.schema';
import { Nurse } from '../users/schemas/nurse.schema';
import { UserType, UserStatus } from '../../common/enums';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPatientModel: any;
  let mockNurseModel: any;
  let mockOtpService: jest.Mocked<Partial<OtpService>>;
  let mockTokenService: jest.Mocked<Partial<TokenService>>;
  let mockEmailProvider: jest.Mocked<Partial<EmailProvider>>;

  const testEmail = 'patient@test.com';
  const testCode = '123456';

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    mockPatientModel = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockNurseModel = {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    };

    mockOtpService = {
      generateOtp: jest.fn().mockReturnValue(testCode),
      createOtpSession: jest.fn().mockResolvedValue(undefined),
      verifyOtpSession: jest.fn().mockResolvedValue(true),
      countRecentSessions: jest.fn().mockResolvedValue(0),
    };

    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access_token'),
      createRefreshToken: jest.fn().mockResolvedValue('refresh_token'),
      findRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn().mockResolvedValue('new_refresh_token'),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailProvider = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(OtpSession.name), useValue: {} },
        { provide: getModelToken(RefreshToken.name), useValue: {} },
        { provide: getModelToken(Patient.name), useValue: mockPatientModel },
        { provide: getModelToken(Nurse.name), useValue: mockNurseModel },
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: EmailProvider, useValue: mockEmailProvider },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('does not create a user — only generates OTP and sends email', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.sendOtp({
        email: testEmail,
        role: UserType.PATIENT,
      });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: testEmail });
      expect(mockUserModel.create).not.toHaveBeenCalled();
      expect(mockOtpService.generateOtp).toHaveBeenCalled();
      expect(mockOtpService.createOtpSession).toHaveBeenCalledWith(testEmail, testCode);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
        testCode,
      );
      expect(result.message).toBe('تم إرسال رمز التحقق بنجاح');
    });

    it('returns Arabic message when user exists with matching role', async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: 'existing_user',
        email: testEmail,
        type: UserType.NURSE,
      });

      const result = await service.sendOtp({
        email: testEmail,
        role: UserType.NURSE,
      });

      expect(mockUserModel.create).not.toHaveBeenCalled();
      expect(mockOtpService.generateOtp).toHaveBeenCalled();
      expect(result.message).toBe('تم إرسال رمز التحقق بنجاح');
    });

    it('throws ConflictException when user exists with different role', async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: 'existing_user',
        email: testEmail,
        type: UserType.NURSE,
      });

      await expect(
        service.sendOtp({
          email: testEmail,
          role: UserType.PATIENT,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockUserModel.create).not.toHaveBeenCalled();
      expect(mockOtpService.generateOtp).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('returns accessToken, refreshToken and user on success', async () => {
      const mockUser = {
        _id: { toString: () => 'user_id_123' },
        email: testEmail,
        phone: '+201234567890',
        type: UserType.PATIENT,
        status: UserStatus.ACTIVE,
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.verifyOtp({
        email: testEmail,
        code: testCode,
        role: UserType.PATIENT,
      });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: testEmail });
      expect(mockOtpService.verifyOtpSession).toHaveBeenCalledWith(testEmail, testCode);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalled();
      expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith('user_id_123');
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(result.user).toBeDefined();
    });

    it('creates a new user when user not found', async () => {
      const newUser = {
        _id: { toString: () => 'new_user_id' },
        email: testEmail,
        type: UserType.PATIENT,
        status: UserStatus.ACTIVE,
      };
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(newUser);

      const result = await service.verifyOtp({
        email: testEmail,
        code: testCode,
        role: UserType.PATIENT,
      });

      expect(mockUserModel.create).toHaveBeenCalledWith({
        email: testEmail,
        type: UserType.PATIENT,
        status: UserStatus.ACTIVE,
      });
      expect(result.accessToken).toBe('access_token');
      expect(result.user.id).toBe('new_user_id');
    });
  });

  describe('refresh', () => {
    it('rotates token and returns new access and refresh tokens', async () => {
      const mockTokenDoc = {
        userId: 'user_id_123',
        isRevoked: false,
      };
      mockTokenService.findRefreshToken = jest.fn().mockResolvedValue(mockTokenDoc);

      const mockUser = {
        _id: 'user_id_123',
        email: testEmail,
        phone: '+201234567890',
        type: UserType.PATIENT,
      };
      Object.assign(mockUser, { _id: { toString: () => 'user_id_123' } });
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.refresh({ refreshToken: 'valid_refresh_token' });

      expect(mockTokenService.findRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockTokenService.rotateRefreshToken).toHaveBeenCalledWith(
        'valid_refresh_token',
        'user_id_123',
      );
      expect(mockTokenService.generateAccessToken).toHaveBeenCalled();
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });

    it('throws UnauthorizedException when refresh token is invalid', async () => {
      mockTokenService.findRefreshToken = jest.fn().mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'invalid_token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes refresh token and returns Arabic message', async () => {
      const mockTokenDoc = { userId: { toString: () => 'user_1' }, isRevoked: false };
      mockTokenService.findRefreshToken = jest.fn().mockResolvedValue(mockTokenDoc);
      const result = await service.logout('user_1', { refreshToken: 'token_to_revoke' });

      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith('token_to_revoke');
      expect(result.message).toBe('تم تسجيل الخروج بنجاح');
    });
  });
});
