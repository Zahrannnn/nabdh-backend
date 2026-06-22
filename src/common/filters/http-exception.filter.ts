import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'حدث خطأ غير متوقع';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        error = exception.name;
        message = exResponse;
      } else if (typeof exResponse === 'object') {
        const resp = exResponse as Record<string, unknown>;
        error = (resp.error as string) || exception.name;
        const msg = resp.message;
        message = Array.isArray(msg)
          ? (msg as string[])
          : msg
            ? [String(msg)]
            : [exception.message];
      }
    } else if (this.isMongooseDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      error = 'Conflict';
      message = 'تعارض في البيانات';
    } else if (this.isMongooseCastError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'معرّف غير صالح';
    } else if (this.isMongooseValidationError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'خطأ في التحقق';
    } else if (this.isMongooseServerError(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Service Unavailable';
      message = 'خدمة قاعدة البيانات غير متاحة';
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      message = 'حدث خطأ غير متوقع';
    }

    const requestId = (request as Request & { requestId?: string }).requestId || uuidv4();

    response.status(status).json({
      statusCode: status,
      error,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    });
  }

  private isMongooseDuplicateKeyError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      (exception as { code: unknown }).code === 11000
    );
  }

  private isMongooseCastError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      (exception as { name: unknown }).name === 'CastError'
    );
  }

  private isMongooseValidationError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      (exception as { name: unknown }).name === 'ValidationError'
    );
  }

  private isMongooseServerError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      ((exception as { name: unknown }).name === 'MongooseServerSelectionError' ||
        (exception as { name: unknown }).name === 'MongoServerSelectionError' ||
        (exception as { name: unknown }).name === 'MongoNetworkError')
    );
  }
}
