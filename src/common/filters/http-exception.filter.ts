import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let messages: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        error = exResponse;
      } else if (typeof exResponse === 'object') {
        const resp = exResponse as Record<string, unknown>;
        error = (resp.error as string) || exception.name;
        const msg = resp.message;
        messages = Array.isArray(msg) ? (msg as string[]) : msg ? [msg as string] : [];
      }
    } else if (exception instanceof Error) {
      error = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      error,
      message: messages,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as Request & { requestId?: string }).requestId || uuidv4(),
    });
  }
}
