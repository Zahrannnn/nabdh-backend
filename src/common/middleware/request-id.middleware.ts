import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, _res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestId = requestId;
    _res.setHeader('X-Request-Id', requestId);
    next();
  }
}
