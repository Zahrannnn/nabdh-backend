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
import { MongooseModule } from '@nestjs/mongoose';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';

describe('Nabdh API (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-e2e';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => ({ uri: mongoUri }),
        }),
        AppModule,
      ],
    })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
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
  }, 120000);

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('Health', () => {
    it('GET /api/v1/health returns 200', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/otp/send returns 201 for new patient', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ phone: '+201234567890', role: 'PATIENT' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('تم إرسال رمز التحقق بنجاح');
        });
    });

    it('POST /api/v1/auth/otp/send with missing role returns 400', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ phone: '+201234567890' })
        .expect(400);
    });

    it('POST /api/v1/auth/otp/send with invalid phone returns 400', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ phone: 'invalid', role: 'PATIENT' })
        .expect(400);
    });

    it('POST /api/v1/auth/otp/verify with non-existent user returns 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ phone: '+201999999999', code: '123456', role: 'PATIENT' })
        .expect(401);
    });

    it('POST /api/v1/auth/refresh with invalid token returns 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_token_long_enough_12345' })
        .expect(401);
    });

    it('POST /api/v1/auth/logout without auth returns 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some_token_long_enough_12345' })
        .expect(401);
    });
  });

  describe('Admin Auth', () => {
    it('POST /api/v1/auth/admin/login returns 401 for non-existent admin', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/admin/login')
        .send({ email: 'nobody@test.com', password: 'password' })
        .expect(401);
    });

    it('POST /api/v1/auth/admin/verify-2fa returns 401 with invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/admin/verify-2fa')
        .send({ tempToken: 'a'.repeat(64), totpCode: '123456' })
        .expect(401);
    });
  });
});
