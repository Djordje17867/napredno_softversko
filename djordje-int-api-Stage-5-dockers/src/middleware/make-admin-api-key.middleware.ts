import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MakeAdminApiKey implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  private readonly apiKey = this.configService.get<string>(
    'CREATE_ADMIN_API_KEY',
  );

  use(req: Request, res: Response, next: NextFunction) {
    const receivedApiKey = req.headers['x-api-key'];

    if (receivedApiKey !== this.apiKey) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    next();
  }
}
