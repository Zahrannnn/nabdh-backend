import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Nurse, NurseDocument } from '../users/schemas/nurse.schema';
import { OtpSession, OtpSessionDocument } from './schemas/otp-session.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { EmailProvider } from './providers/email.provider';
import { UserStatus, UserType, VerificationStatus } from '../../common/enums';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(OtpSession.name) private readonly otpSessionModel: Model<OtpSessionDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Nurse.name) private readonly nurseModel: Model<NurseDocument>,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly emailProvider: EmailProvider,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    try {
      const recentCount = await this.otpService.countRecentSessions(dto.email);
      if (recentCount >= 3) {
        throw new HttpException('الرجاء المحاولة مرة أخرى بعد قليل', 429);
      }

      const existingUser = await this.userModel.findOne({ email: dto.email });
      if (existingUser && existingUser.type !== dto.role) {
        throw new ConflictException('هذا البريد مسجل بنوع مستخدم مختلف');
      }

      const code = this.otpService.generateOtp();
      await this.otpService.createOtpSession(dto.email, code);
      await this.emailProvider.sendEmail(dto.email, 'رمز التحقق من تطبيق نبض', code);

      this.logger.log(`AUDIT: OTP_SENT email=${dto.email} role=${dto.role}`);

      return { message: 'تم إرسال رمز التحقق بنجاح' };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof MongooseError) {
        this.logger.error(`Database error in sendOtp: ${(err as Error).message}`);
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      const e = err as { name?: string; code?: number | string };
      if (
        e?.name === 'MongooseServerSelectionError' ||
        e?.name === 'MongoServerSelectionError' ||
        e?.name === 'MongoNetworkError' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT'
      ) {
        this.logger.error(
          `Database connection error in sendOtp: ${String(e?.name || '')} ${String(e?.code || '')}`,
        );
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      if (e?.code === 11000) {
        throw new ConflictException('هذا البريد مسجل مسبقاً');
      }
      this.logger.error(
        `Unexpected error in sendOtp: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      throw new InternalServerErrorException('حدث خطأ غير متوقع');
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    user: { id: string; email: string; type: string; nurseStatus?: string };
  }> {
    try {
      await this.otpService.verifyOtpSession(dto.email, dto.code);

      let user = await this.userModel.findOne({ email: dto.email });
      let nurseStatus: string | undefined;
      let isNewUser = false;

      if (user) {
        if (user.status !== UserStatus.ACTIVE) {
          if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
            throw new ForbiddenException('تم تعليق حسابك، تواصل مع الدعم');
          }
          throw new ForbiddenException('الحساب غير نشط');
        }
        if (user.type !== dto.role) {
          throw new ConflictException('الحساب موجود بدور مختلف');
        }
        if (user.type === UserType.NURSE) {
          const nurse = await this.nurseModel.findOne({ userId: user._id }).lean();
          nurseStatus = nurse?.verificationStatus;
        }
      } else {
        user = await this.userModel.create({
          email: dto.email,
          type: dto.role,
          status: UserStatus.ACTIVE,
        });
        isNewUser = true;

        this.logger.log(`AUDIT: USER_REGISTERED userId=${user._id} type=${user.type}`);
      }

      const accessToken = this.tokenService.generateAccessToken({
        _id: user._id.toString(),
        phone: user.phone,
        type: user.type,
        nurseStatus,
      });
      const refreshToken = await this.tokenService.createRefreshToken(user._id.toString());

      await this.otpService.consumeOtpSession(dto.email);

      return {
        accessToken,
        refreshToken,
        isNewUser,
        user: {
          id: user._id.toString(),
          email: user.email || dto.email,
          type: user.type,
          nurseStatus,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof MongooseError) {
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      const e = err as { name?: string; code?: number | string };
      if (e?.code === 11000) {
        throw new ConflictException('هذا البريد مسجل مسبقاً');
      }
      if (
        e?.name === 'MongooseServerSelectionError' ||
        e?.name === 'MongoServerSelectionError' ||
        e?.name === 'MongoNetworkError' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT'
      ) {
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      this.logger.error(
        `Unexpected error in verifyOtp: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      throw new InternalServerErrorException('حدث خطأ غير متوقع');
    }
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const tokenDoc = await this.tokenService.findRefreshToken(dto.refreshToken);
      if (!tokenDoc) {
        throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي الصلاحية');
      }

      const userId = tokenDoc.userId.toString();
      const newRefreshToken = await this.tokenService.rotateRefreshToken(dto.refreshToken, userId);

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new UnauthorizedException('المستخدم غير موجود');
      }

      const accessToken = this.tokenService.generateAccessToken({
        _id: user._id.toString(),
        phone: user.phone,
        type: user.type,
      });

      this.logger.log(`AUDIT: TOKEN_REFRESHED userId=${userId}`);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof MongooseError) {
        if (err.name === 'CastError') {
          throw new BadRequestException('معرّف المستخدم غير صالح');
        }
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      const e = err as { name?: string; code?: number | string };
      if (
        e?.name === 'MongooseServerSelectionError' ||
        e?.name === 'MongoServerSelectionError' ||
        e?.name === 'MongoNetworkError' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT'
      ) {
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      throw new InternalServerErrorException('حدث خطأ غير متوقع');
    }
  }

  async logout(userId: string, dto: RefreshTokenDto): Promise<{ message: string }> {
    try {
      const tokenDoc = await this.tokenService.findRefreshToken(dto.refreshToken);
      if (!tokenDoc) {
        throw new UnauthorizedException('رمز غير صالح');
      }
      if (tokenDoc.userId.toString() !== userId) {
        throw new UnauthorizedException('رمز غير صالح');
      }
      await this.tokenService.revokeRefreshToken(dto.refreshToken);
      this.logger.log(`AUDIT: USER_LOGOUT userId=${userId}`);
      return { message: 'تم تسجيل الخروج بنجاح' };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof MongooseError) {
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      const e = err as { name?: string; code?: number | string };
      if (
        e?.name === 'MongooseServerSelectionError' ||
        e?.name === 'MongoServerSelectionError' ||
        e?.name === 'MongoNetworkError' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT'
      ) {
        throw new ServiceUnavailableException('خدمة قاعدة البيانات غير متاحة حالياً');
      }
      throw new InternalServerErrorException('حدث خطأ غير متوقع');
    }
  }
}
