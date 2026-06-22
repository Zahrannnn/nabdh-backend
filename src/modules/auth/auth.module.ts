import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './services/admin-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { Patient, PatientSchema } from '../users/schemas/patient.schema';
import { Nurse, NurseSchema } from '../users/schemas/nurse.schema';
import { OtpSession, OtpSessionSchema } from './schemas/otp-session.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { TempToken, TempTokenSchema } from './schemas/temp-token.schema';
import { OtpService, TokenService } from './services';
import { SmsProvider, SmsStubProvider, TwilioSmsProvider } from './providers';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'change-me-in-production',
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRY') || '15m',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: OtpSession.name, schema: OtpSessionSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: TempToken.name, schema: TempTokenSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Nurse.name, schema: NurseSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService,
    AdminAuthService,
    JwtStrategy,
    OtpService,
    TokenService,
    {
      provide: SmsProvider,
      useFactory: (configService: ConfigService) => {
        if (configService.get<string>('SMS_PROVIDER') === 'twilio') {
          return new TwilioSmsProvider(configService);
        }
        return new SmsStubProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, JwtStrategy, OtpService, TokenService, SmsProvider],
})
export class AuthModule {}
