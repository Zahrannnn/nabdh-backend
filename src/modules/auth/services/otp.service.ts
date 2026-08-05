import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OtpSession, OtpSessionDocument } from '../schemas/otp-session.schema';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpSession.name) private readonly otpSessionModel: Model<OtpSessionDocument>,
  ) {}

  generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  async createOtpSession(email: string, code: string): Promise<OtpSessionDocument> {
    try {
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const session = new this.otpSessionModel({ email, codeHash, expiresAt });
      return await session.save();
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

  async countRecentSessions(email: string): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      return await this.otpSessionModel.countDocuments({
        email,
        createdAt: { $gte: fifteenMinutesAgo },
      });
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

  async verifyOtpSession(email: string, code: string): Promise<boolean> {
    try {
      const session = await this.otpSessionModel
        .findOne({ email, isUsed: false, expiresAt: { $gt: new Date() } })
        .sort({ createdAt: -1 });

      if (!session || session.attempts >= 3) {
        throw new UnauthorizedException('رمز التحقق غير صالح أو منتهي الصلاحية');
      }

      const isValid = await bcrypt.compare(code, session.codeHash);
      if (!isValid) {
        session.attempts += 1;
        await session.save();
        throw new UnauthorizedException('رمز التحقق غير صحيح');
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof MongooseError) {
        if (err.name === 'CastError') {
          throw new BadRequestException('البريد الإلكتروني غير صالح');
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

  async consumeOtpSession(email: string): Promise<void> {
    try {
      await this.otpSessionModel.updateOne({ email, isUsed: false }, { isUsed: true });
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
