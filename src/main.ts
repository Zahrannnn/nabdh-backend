import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: ['http://localhost:*', 'http://127.0.0.1:*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nabdh API')
    .setDescription(
      `Nabdh Platform — Home Nursing Marketplace API (Egypt).

## Authentication

Patients and nurses authenticate with **email OTP**:
1. \`POST /api/v1/auth/otp/send\` — receive a 6-digit code by email
2. \`POST /api/v1/auth/otp/verify\` — exchange code for access + refresh tokens
3. Use the returned \`accessToken\` with the **Authorize** button below

Admins authenticate via \`POST /api/v1/admin-auth/login\` (email + password).

Protected endpoints require \`Authorization: Bearer <accessToken>\`.`,
    )
    .setVersion('1.3')
    .addTag('Auth', 'Email OTP authentication for patients & nurses')
    .addTag('Admin Auth', 'Admin login with email & password')
    .addTag('Users', 'User profile management')
    .addTag('Booking', 'Home nursing booking flow')
    .addTag('Location', 'Geospatial search of nurses')
    .addTag('Payment', 'Payment & billing')
    .addTag('Notifications', 'Push notifications & settings')
    .addTag('Upload', 'File uploads')
    .addTag('Analytics', 'Reports & statistics')
    .addTag('Admin', 'Admin operations')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by POST /auth/otp/verify or /auth/refresh',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: -1,
    },
    customSiteTitle: 'Nabdh API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Nabdh API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
