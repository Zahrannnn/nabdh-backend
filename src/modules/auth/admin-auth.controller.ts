import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminLoginDto, VerifyTwoFactorDto, ActivateTwoFactorDto } from './dto';
import { SetupTwoFactorResponseDto } from './dto/setup-2fa.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserType } from '../../common/enums';

@ApiTags('Admin Auth')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful or 2FA required' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.password);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code for 2FA' })
  @ApiResponse({ status: 200, description: '2FA verified, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session' })
  async verifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.adminAuthService.verifyTwoFactor(dto.tempToken, dto.totpCode);
  }

  @Post('setup-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Generate TOTP secret and QR code' })
  @ApiResponse({ status: 200, description: '2FA setup data', type: SetupTwoFactorResponseDto })
  @ApiResponse({ status: 409, description: '2FA already active' })
  async setupTwoFactor(@CurrentUser('userId') userId: string) {
    return this.adminAuthService.setupTwoFactor(userId);
  }

  @Post('activate-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Activate 2FA by verifying TOTP code' })
  @ApiResponse({ status: 200, description: '2FA activated' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  async activateTwoFactor(
    @CurrentUser('userId') userId: string,
    @Body() dto: ActivateTwoFactorDto,
  ) {
    return this.adminAuthService.setupTwoFactor(userId, dto.totpCode);
  }
}
