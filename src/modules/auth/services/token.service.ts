import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model } from 'mongoose';
import * as crypto from 'crypto';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';

interface TokenUser {
  _id: any;
  email: string;
  type: string;
  nurseStatus?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  generateAccessToken(user: TokenUser): string {
    try {
      return this.jwtService.sign(
        {
          sub: user._id.toString(),
          email: user.email,
          type: user.type,
          nurseStatus: user.nurseStatus,
        },
        { expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY') },
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('تعذر إنشاء رمز الوصول');
    }
  }

  async createRefreshToken(userId: string): Promise<string> {
    try {
      const rawToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.refreshTokenModel.create({ userId, tokenHash, expiresAt });
      return rawToken;
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

  async rotateRefreshToken(rawToken: string, userId: string): Promise<string> {
    try {
      const tokenHash = this.hashToken(rawToken);
      await this.refreshTokenModel.updateOne(
        { tokenHash },
        { $set: { revokedAt: new Date(), isRevoked: true } },
      );
      return await this.createRefreshToken(userId);
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

  async revokeRefreshToken(rawToken: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(rawToken);
      await this.refreshTokenModel.updateOne(
        { tokenHash },
        { $set: { revokedAt: new Date(), isRevoked: true } },
      );
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

  async findRefreshToken(rawToken: string): Promise<RefreshTokenDocument | null> {
    try {
      const tokenHash = this.hashToken(rawToken);
      return await this.refreshTokenModel.findOne({
        tokenHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
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
}
