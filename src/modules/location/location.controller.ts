import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Location')
@ApiBearerAuth()
@Controller()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Post('nurse/location')
  @ApiOperation({ summary: 'Update nurse GPS location' })
  async updateLocation(@Body() body: { latitude: number; longitude: number }) {
    return this.locationService.updateLocation(body);
  }

  @Public()
  @Get('nurses/nearby')
  @ApiOperation({ summary: 'Find nearby nurses' })
  async findNearbyNurses() {
    return this.locationService.findNearbyNurses();
  }
}
