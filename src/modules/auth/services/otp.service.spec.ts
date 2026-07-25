import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';
import { OtpSession } from '../schemas/otp-session.schema';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_code'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('OtpService', () => {
  let service: OtpService;
  let mockOtpSessionModel: any;

  beforeEach(async () => {
    mockOtpSessionModel = jest.fn().mockImplementation((doc) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(doc),
    })) as any;
    mockOtpSessionModel.findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getModelToken(OtpSession.name), useValue: mockOtpSessionModel },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOtp', () => {
    it('returns a 6-digit string', () => {
      const otp = service.generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe('createOtpSession', () => {
    it('calls bcrypt.hash and saves a new session document', async () => {
      const email = 'user@test.com';
      const code = '123456';

      const result = await service.createOtpSession(email, code);

      expect(bcrypt.hash).toHaveBeenCalledWith(code, 10);
      expect(mockOtpSessionModel).toHaveBeenCalledWith(
        expect.objectContaining({ email, codeHash: 'hashed_code' }),
      );
      expect(result.email).toBe(email);
      expect(result.codeHash).toBe('hashed_code');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyOtpSession', () => {
    it('returns true when code matches and marks session as used', async () => {
      const mockSession = {
        email: 'user@test.com',
        codeHash: 'hashed_code',
        attempts: 0,
        isUsed: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockOtpSessionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.verifyOtpSession('user@test.com', '123456');

      expect(result).toBe(true);
      expect(mockSession.isUsed).toBe(true);
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthorizedException when code is wrong and increments attempts', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const mockSession = {
        email: 'user@test.com',
        codeHash: 'hashed_code',
        attempts: 0,
        isUsed: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockOtpSessionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockSession),
      });

      await expect(service.verifyOtpSession('user@test.com', 'wrong_code')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockSession.attempts).toBe(1);
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthorizedException when attempts >= 3 even if code is correct', async () => {
      const mockSession = {
        email: 'user@test.com',
        codeHash: 'hashed_code',
        attempts: 3,
        isUsed: false,
        save: jest.fn(),
      };
      mockOtpSessionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockSession),
      });

      await expect(service.verifyOtpSession('user@test.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockSession.save).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when attempts > 3', async () => {
      const mockSession = {
        email: 'user@test.com',
        codeHash: 'hashed_code',
        attempts: 5,
        isUsed: false,
        save: jest.fn(),
      };
      mockOtpSessionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockSession),
      });

      await expect(service.verifyOtpSession('user@test.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when no valid session exists', async () => {
      mockOtpSessionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      await expect(service.verifyOtpSession('user@test.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
