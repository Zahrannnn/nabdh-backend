import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard summary' })
  async dashboard() {
    return this.adminService.getDashboard();
  }

  @Public()
  @Get('audit-logs')
  @ApiOperation({ summary: 'List audit logs' })
  async auditLogs() {
    return this.adminService.getAuditLogs();
  }
}
