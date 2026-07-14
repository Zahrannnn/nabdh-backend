import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationHistory, LocationHistorySchema } from './schemas/location-history.schema';
import { Nurse, NurseSchema } from '../users/schemas';
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: LocationHistory.name,
        schema: LocationHistorySchema,
      },
      {
        name: Nurse.name,
        schema: NurseSchema,
      },
    ]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
