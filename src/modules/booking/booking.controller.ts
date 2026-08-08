import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateRequestDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Booking')
@ApiBearerAuth('access-token')
@Controller()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Public()
  @Post('requests')
  @ApiOperation({ summary: 'Create a new service request' })
  async createRequest(@Body() dto: CreateRequestDto) {
    return this.bookingService.createRequest(dto);
  }

  @Public()
  @Get('requests/:id')
  @ApiOperation({ summary: 'Get service request details' })
  async getRequest(@Param('id') id: string) {
    return this.bookingService.getRequest(id);
  }

  @Public()
  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking details' })
  async getBooking(@Param('id') id: string) {
    return this.bookingService.getBooking(id);
  }
}
