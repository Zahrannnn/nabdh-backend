import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  getConnection(): Connection {
    return this.connection;
  }

  async ping(): Promise<boolean> {
    try {
      await this.connection.db?.admin().ping();
      return true;
    } catch (error) {
      this.logger.error('MongoDB ping failed', error);
      return false;
    }
  }
}
