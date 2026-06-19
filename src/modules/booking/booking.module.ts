import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { ServiceRequest, ServiceRequestSchema } from './schemas/service-request.schema';
import { Offer, OfferSchema } from './schemas/offer.schema';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { Rating, RatingSchema } from './schemas/rating.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceRequest.name, schema: ServiceRequestSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
