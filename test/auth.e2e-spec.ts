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

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';

import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { EmailProvider } from '../src/modules/auth/providers/email.provider';
import { UploadService } from '../src/modules/upload/upload.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { User } from '../src/modules/users/schemas/user.schema';
import { Patient } from '../src/modules/users/schemas/patient.schema';
import { Nurse } from '../src/modules/users/schemas/nurse.schema';
import { OtpSession } from '../src/modules/auth/schemas/otp-session.schema';
import { RefreshToken } from '../src/modules/auth/schemas/refresh-token.schema';

class CapturingEmailProvider extends EmailProvider {
  public lastCode: string | null = null;
  public lastEmail: string | null = null;
  constructor() {
    super({ get: () => undefined } as any);
  }
  async sendEmail(to: string, _subject: string, body: string): Promise<void> {
    this.lastEmail = to;
    const match = body.match(/\d{6}/);
    this.lastCode = match ? match[0] : null;
  }
}

const JWT_SECRET = 'test-secret-e2e';

describe('Auth E2E', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let emailProvider: CapturingEmailProvider;
  let userModel: any;
  let patientModel: any;
  let nurseModel: any;
  let otpSessionModel: any;
  let refreshTokenModel: any;
  let jwtService: JwtService;
  const originalSecret = process.env.JWT_SECRET;

  let patientTokens: { accessToken: string; refreshToken: string; userId: string };

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    emailProvider = new CapturingEmailProvider();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          useFactory: async () => ({ uri: mongoUri }),
        }),
        AuthModule,
        UsersModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      .overrideProvider(EmailProvider)
      .useValue(emailProvider)
      .overrideProvider(UploadService)
      .useValue({
        upload: () => ({ url: '', key: '', mimeType: '', size: 0 }),
        delete: () => undefined,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    userModel = moduleRef.get(getModelToken(User.name));
    patientModel = moduleRef.get(getModelToken(Patient.name));
    nurseModel = moduleRef.get(getModelToken(Nurse.name));
    otpSessionModel = moduleRef.get(getModelToken(OtpSession.name));
    refreshTokenModel = moduleRef.get(getModelToken(RefreshToken.name));
    jwtService = moduleRef.get(JwtService);
  }, 60000);

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
    process.env.JWT_SECRET = originalSecret;
  }, 30000);

  describe('1. Full OTP flow for patient', () => {
    const email = 'patient@test.com';

    it('sends OTP, captures code, registers patient, and returns valid tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('تم إرسال رمز التحقق بنجاح');
        });

      expect(emailProvider.lastCode).toMatch(/^\d{6}$/);
      expect(emailProvider.lastEmail).toBe(email);

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: emailProvider.lastCode, role: 'PATIENT' })
        .expect(200);

      expect(verifyRes.body.accessToken).toBeDefined();
      expect(verifyRes.body.refreshToken).toBeDefined();
      expect(verifyRes.body.user.id).toBeDefined();
      expect(verifyRes.body.user.email).toBe(email);
      expect(verifyRes.body.user.type).toBe('PATIENT');

      const accessToken = verifyRes.body.accessToken;
      const refreshToken = verifyRes.body.refreshToken;

      const user = await userModel.findOne({ email });
      expect(user).toBeTruthy();
      expect(user.type).toBe('PATIENT');
      expect(user.status).toBe('ACTIVE');

      const patient = await patientModel.findOne({ userId: user._id });
      expect(patient).toBeTruthy();

      const decoded = jwtService.verify(accessToken) as Record<string, unknown>;
      expect(decoded.type).toBe('PATIENT');
      expect(decoded.sub).toBeDefined();

      patientTokens = { accessToken, refreshToken, userId: user._id.toString() };

      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'NURSE' })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('هذا البريد مسجل بنوع مستخدم مختلف');
        });
    });
  });

  describe('2. Full OTP flow for nurse', () => {
    const email = 'nurse@test.com';

    it('registers nurse with INCOMPLETE verification status', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'NURSE' })
        .expect(201);

      expect(emailProvider.lastCode).toMatch(/^\d{6}$/);

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: emailProvider.lastCode, role: 'NURSE' })
        .expect(200);

      expect(verifyRes.body.accessToken).toBeDefined();
      expect(verifyRes.body.refreshToken).toBeDefined();
      expect(verifyRes.body.user.type).toBe('NURSE');
      expect(verifyRes.body.user.nurseStatus).toBe('INCOMPLETE');

      const accessToken = verifyRes.body.accessToken;
      const user = await userModel.findOne({ email });
      expect(user).toBeTruthy();
      expect(user.type).toBe('NURSE');

      const nurse = await nurseModel.findOne({ userId: user._id });
      expect(nurse).toBeTruthy();
      expect(nurse.verificationStatus).toBe('INCOMPLETE');
      expect(nurse.licenseNumber.startsWith('PENDING-')).toBe(true);

      const decoded = jwtService.verify(accessToken) as Record<string, unknown>;
      expect(decoded.type).toBe('NURSE');
      expect(decoded.nurseStatus).toBe('INCOMPLETE');
    });
  });

  describe('3. Refresh token rotation', () => {
    it('rotates the refresh token and revokes the old one', async () => {
      const oldRefreshToken = patientTokens.refreshToken;

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
      expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401)
        .expect((res) => {
          expect(res.body.message[0]).toBe('رمز التحديث غير صالح أو منتهي الصلاحية');
        });
    });
  });

  describe('4. Logout flow', () => {
    const email = 'logout@test.com';

    it('logs out a user and revokes the refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201);

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: emailProvider.lastCode, role: 'PATIENT' })
        .expect(200);

      const accessToken = verifyRes.body.accessToken;
      const refreshToken = verifyRes.body.refreshToken;

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('تم تسجيل الخروج بنجاح');

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('5. Logout without auth', () => {
    it('rejects logout request without Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'anything_long_enough_12345' })
        .expect(401);
    });
  });

  describe('6. Logout with mismatched user', () => {
    const emailA = 'usera@test.com';
    const emailB = 'userb@test.com';

    it('rejects logout with another user refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email: emailA, role: 'PATIENT' })
        .expect(201);
      const aVerify = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email: emailA, code: emailProvider.lastCode, role: 'PATIENT' })
        .expect(200);
      const aRefresh = aVerify.body.refreshToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email: emailB, role: 'PATIENT' })
        .expect(201);
      const bVerify = await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email: emailB, code: emailProvider.lastCode, role: 'PATIENT' })
        .expect(200);
      const bAccess = bVerify.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${bAccess}`)
        .send({ refreshToken: aRefresh })
        .expect(401);
    });
  });

  describe('7. Email-level rate limiting', () => {
    const email = 'ratelimit@test.com';

    it('blocks 4th sendOtp within 15 minutes for same email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(429)
        .expect((res) => {
          expect(res.body.message[0]).toBe('الرجاء المحاولة مرة أخرى بعد قليل');
        });
    });
  });

  describe('8. Role mismatch on sendOtp', () => {
    const email = 'rolemismatch@test.com';

    it('rejects sendOtp for existing user with different role', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'NURSE' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: emailProvider.lastCode, role: 'NURSE' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(409)
        .expect((res) => {
          expect(res.body.message[0]).toBe('هذا البريد مسجل بنوع مستخدم مختلف');
        });
    });
  });

  describe('9. Admin login without 2FA', () => {
    it('returns 403 when admin totpSecret is null', async () => {
      const hashed = await bcrypt.hash('admin123', 10);
      await userModel.create({
        phone: '+201999999990',
        email: 'admin@nabdh.com',
        passwordHash: hashed,
        type: 'ADMIN',
        status: 'ACTIVE',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/admin/login')
        .send({ email: 'admin@nabdh.com', password: 'admin123' })
        .expect(403)
        .expect((res) => {
          expect(res.body.message[0]).toBe(
            'المصادقة الثنائية غير مفعلة. تواصل مع المدير العام لتفعيلها',
          );
        });
    });
  });

  describe('10. Suspended user cannot login', () => {
    const email = 'suspended@test.com';

    it('rejects OTP verification for suspended user with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: emailProvider.lastCode, role: 'PATIENT' })
        .expect(200);

      await userModel.updateOne({ email }, { $set: { status: 'SUSPENDED' } });

      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ email, role: 'PATIENT' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: emailProvider.lastCode, role: 'PATIENT' })
        .expect(403)
        .expect((res) => {
          expect(res.body.message[0]).toBe('تم تعليق حسابك، تواصل مع الدعم');
        });
    });
  });
});
