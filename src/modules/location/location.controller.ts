import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { UpdateLocationDto, NearbyQueryDto } from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, Roles } from '@common/decorators';
import { LocationService } from './location.service';
import { UserType } from '@common/enums';

@ApiTags('Location')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Roles(UserType.NURSE)
  @Post('nurse/location')
  @ApiOperation({ summary: 'Update nurse GPS location' })
  async updateLocation(@CurrentUser() user: any, @Body() body: UpdateLocationDto) {
    return this.locationService.updateLocation(user._id, body);
  }
  @Roles(UserType.PATIENT)
  @Get('nurses/nearby')
  @ApiOperation({ summary: 'Find nearby nurses' })
  async findNearbyNurses(@Query() query: NearbyQueryDto) {
    return this.locationService.findNearbyNurses(query);
  }

  @Roles(UserType.ADMIN, UserType.NURSE)
  @Get('nurse/location-history/:nurseId')
  @ApiOperation({ summary: 'Get nurse location history' })
  async getLocationHistory(@Param('nurseId') nurseId: string, @CurrentUser() user: any) {
    return this.locationService.getLocationHistory(nurseId, user._id, user.type);
  }
}
