import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly databaseService: DatabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (includes database)' })
  async readiness() {
    const dbConnected = await this.databaseService.ping();
    if (dbConnected) {
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    }
    this.logger.error('Readiness check failed — MongoDB unreachable');
    return {
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
