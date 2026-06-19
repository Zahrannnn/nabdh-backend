import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationHistory, LocationHistorySchema } from './schemas/location-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LocationHistory.name, schema: LocationHistorySchema }]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
