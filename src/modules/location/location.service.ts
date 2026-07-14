import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { LocationHistory, LocationHistoryDocument } from './schemas/location-history.schema';
import { Nurse } from '../users/schemas';
import { NurseDocument } from '../users/schemas/nurse.schema';
import { UserType, VerificationStatus, GenderPreference } from '@common/enums';
import { NearbyQueryDto } from './dto';
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  constructor(
    @InjectModel(Nurse.name)
    private readonly nurseModel: Model<NurseDocument>,

    @InjectModel(LocationHistory.name)
    private readonly locationHistoryModel: Model<LocationHistoryDocument>,
  ) {}

  async updateLocation(
    userId: string,
    body: { latitude: number; longitude: number; speed?: number },
  ) {
    const nurse = await this.nurseModel.findOne({ userId });

    if (!nurse) {
      throw new NotFoundException('Nurse profile not found');
    }

    nurse.location = {
      type: 'Point',
      coordinates: [body.longitude, body.latitude],
    };

    await nurse.save();
    await this.locationHistoryModel.create({
      nurseId: nurse._id,
      lat: body.latitude,
      lng: body.longitude,
      speed: body.speed,
    });

    return { success: true };
  }

  async findNearbyNurses(query: NearbyQueryDto) {
    const pipeline: PipelineStage[] = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [query.lng, query.lat],
          },
          distanceField: 'distance',
          maxDistance: query.radiusKm * 1000,
          spherical: true,
          query: {
            isOnline: true,
            verificationStatus: VerificationStatus.APPROVED,
          },
        },
      },
      {
        $project: {
          fullName: 1,
          photoUrl: 1,
          avgRating: 1,
          yearsOfExperience: 1,
          distance: 1,
        },
      },
      {
        $sort: {
          distance: 1,
        },
      },
      { $limit: 50 },
    ];

    const geoNearStage = pipeline[0] as PipelineStage.GeoNear;
    if (query.genderPref && query.genderPref !== GenderPreference.NO_PREFERENCE) {
      (geoNearStage.$geoNear.query as Record<string, unknown>).gender = query.genderPref;
    }
    const nurses = await this.nurseModel.aggregate(pipeline);

    return nurses.map((nurse) => ({
      id: nurse._id,
      fullName: nurse.fullName,
      photoUrl: nurse.photoUrl,
      avgRating: nurse.avgRating,
      yearsOfExperience: nurse.yearsOfExperience,
      distanceKm: Number((nurse.distance / 1000).toFixed(1)),
    }));
  }

  async getLocationHistory(nurseId: string, requesterId: string, requesterType: UserType) {
    if (requesterType !== UserType.ADMIN) {
      const nurse = await this.nurseModel.findById(nurseId);

      if (!nurse) {
        throw new NotFoundException('Nurse not found');
      }

      if (nurse.userId.toString() !== requesterId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const history = await this.locationHistoryModel
      .find({ nurseId })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return history.map((item) => ({
      lat: item.lat,
      lng: item.lng,
      speed: item.speed,
      timestamp: item.createdAt,
    }));
  }
}
