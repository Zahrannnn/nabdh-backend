import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Nabdh API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
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
    it('POST /api/v1/auth/otp/send returns 200', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ phone: '+201234567890' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('POST /api/v1/auth/otp/send with invalid phone returns 400', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/otp/send')
        .send({ phone: 'invalid' })
        .expect(400);
    });
  });

  describe('Booking', () => {
    it('POST /api/v1/requests returns 201', () => {
      return request(app.getHttpServer())
        .post('/api/v1/requests')
        .send({
          latitude: 30.0444,
          longitude: 31.2357,
          type: 'STANDARD',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.status).toBe('PENDING_OFFERS');
        });
    });
  });
});
