import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  InternalServerErrorException,
  HttpException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import * as QRCode from 'qrcode';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { TempToken, TempTokenDocument } from '../schemas/temp-token.schema';
import { TokenService } from './token.service';
import { UserType, UserStatus } from '../../../common/enums';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly otp: OTP;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(TempToken.name) private readonly tempTokenModel: Model<TempTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    this.otp = new OTP({
      strategy: 'totp',
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });
  }

  async login(email: string, password: string) {
    try {
      const user = await this.userModel.findOne({
        email,
        type: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
      }

      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      } catch {
        throw new InternalServerErrorException('تعذر التحقق من كلمة المرور');
      }
      if (!isPasswordValid) {
        throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
      }

      if (!user.totpSecret) {
        throw new ForbiddenException('المصادقة الثنائية غير مفعلة. تواصل مع المدير العام لتفعيلها');
      }

      const tempToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await this.tempTokenModel.create({
        userId: user._id,
        tokenHash,
        expiresAt,
      });

      this.logger.log(`AUDIT: ADMIN_LOGIN_ATTEMPT email=${email}`);

      return { requiresTwoFactor: true, tempToken };
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

  async verifyTwoFactor(tempToken: string, totpCode: string) {
    try {
      const tokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');
      const now = new Date();

      const storedToken = await this.tempTokenModel.findOne({
        tokenHash,
        isVerified: false,
        expiresAt: { $gt: now },
      });

      if (!storedToken) {
        throw new UnauthorizedException('الجلسة منتهية أو غير صالحة');
      }

      const user = await this.userModel.findById(storedToken.userId);
      if (!user || !user.totpSecret) {
        throw new UnauthorizedException('الجلسة منتهية أو غير صالحة');
      }

      let result: { valid: boolean };
      try {
        result = await this.otp.verify({ secret: user.totpSecret, token: totpCode });
      } catch {
        throw new InternalServerErrorException('تعذر التحقق من رمز المصادقة الثنائية');
      }
      if (!result.valid) {
        throw new UnauthorizedException('رمز المصادقة الثنائية غير صحيح');
      }

      await this.tempTokenModel.deleteOne({ _id: storedToken._id });

      this.logger.log(`AUDIT: ADMIN_2FA_SUCCESS userId=${user._id}`);

      const accessToken = this.tokenService.generateAccessToken({
        _id: String(user._id),
        email: user.email,
        type: user.type,
      });
      const refreshToken = await this.tokenService.createRefreshToken(String(user._id));

      return {
        accessToken,
        refreshToken,
        user: { id: String(user._id), email: user.email, type: user.type },
      };
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

  async setupTwoFactor(userId: string, totpCode?: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('المستخدم غير موجود');
      }

      if (totpCode) {
        if (!user.totpSecret) {
          throw new BadRequestException('لم يتم إنشاء رمز المصادقة الثنائية بعد');
        }

        let result: { valid: boolean };
        try {
          result = await this.otp.verify({ secret: user.totpSecret, token: totpCode });
        } catch {
          throw new InternalServerErrorException('تعذر التحقق من رمز المصادقة الثنائية');
        }
        if (!result.valid) {
          throw new UnauthorizedException('رمز المصادقة الثنائية غير صحيح');
        }

        await user.save();
        return { message: 'تم تفعيل المصادقة الثنائية' };
      }

      if (user.totpSecret) {
        throw new ConflictException('المصادقة الثنائية مفعلة بالفعل');
      }

      let secret: string;
      let otpauthUrl: string;
      try {
        secret = this.otp.generateSecret();
        const appName = this.configService.get<string>('APP_NAME', 'Nabdh');
        otpauthUrl = this.otp.generateURI({ issuer: appName, label: user.email!, secret });
      } catch {
        throw new InternalServerErrorException('تعذر إنشاء رمز المصادقة الثنائية');
      }

      let qrCodeDataUrl: string;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      } catch {
        throw new ServiceUnavailableException('تعذر إنشاء رمز QR');
      }

      user.totpSecret = secret;
      await user.save();

      return { secret, qrCodeDataUrl };
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
