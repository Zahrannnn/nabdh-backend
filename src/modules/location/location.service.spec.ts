import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationHistory } from './schemas/location-history.schema';
import { Nurse } from '../users/schemas';
import { UserType } from '@common/enums';

describe('LocationService', () => {
  let service: LocationService;
  let module: TestingModule;

  const nurseModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    aggregate: jest.fn(),
  };

  const locationHistoryModel = {
    create: jest.fn(),
    find: jest.fn(),
  };

  const historyQuery = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getModelToken(Nurse.name),
          useValue: nurseModel,
        },
        {
          provide: getModelToken(LocationHistory.name),
          useValue: locationHistoryModel,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);

    jest.clearAllMocks();
  });

  it('should update nurse location successfully', async () => {
    const nurse = {
      _id: 'nurse-id',
      location: null,
      save: jest.fn().mockResolvedValue(undefined),
    };

    nurseModel.findOne.mockResolvedValue(nurse);
    locationHistoryModel.create.mockResolvedValue({});

    const result = await service.updateLocation('user-id', {
      latitude: 30.0444,
      longitude: 31.2357,
      speed: 40,
    });

    expect(nurseModel.findOne).toHaveBeenCalled();
    expect(nurse.save).toHaveBeenCalled();

    expect(locationHistoryModel.create).toHaveBeenCalledWith({
      nurseId: 'nurse-id',
      bookingId: undefined,
      lat: 30.0444,
      lng: 31.2357,
      speed: 40,
    });

    expect(result).toEqual({
      success: true,
    });
  });

  it('should throw NotFoundException if nurse is not found', async () => {
    nurseModel.findOne.mockResolvedValue(null);

    await expect(
      service.updateLocation('user-id', {
        latitude: 30.0444,
        longitude: 31.2357,
        speed: 40,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(locationHistoryModel.create).not.toHaveBeenCalled();
  });

  it('should return nearby nurses', async () => {
    const nurses = [
      {
        _id: 'nurse-1',
        fullName: 'Maram',
        photoUrl: 'photo1.jpg',
        avgRating: 4.8,
        yearsOfExperience: 5,
        distance: 1200,
      },
      {
        _id: 'nurse-2',
        fullName: 'Ahmed',
        photoUrl: 'photo2.jpg',
        avgRating: 4.5,
        yearsOfExperience: 3,
        distance: 2500,
      },
    ];

    nurseModel.aggregate.mockResolvedValue(nurses);
    const result = await service.findNearbyNurses({
      lat: 30.0444,
      lng: 31.2357,
      radiusKm: 15,
    });

    expect(nurseModel.aggregate).toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: 'nurse-1',
        fullName: 'Maram',
        photoUrl: 'photo1.jpg',
        avgRating: 4.8,
        yearsOfExperience: 5,
        distanceKm: 1.2,
      },
      {
        id: 'nurse-2',
        fullName: 'Ahmed',
        photoUrl: 'photo2.jpg',
        avgRating: 4.5,
        yearsOfExperience: 3,
        distanceKm: 2.5,
      },
    ]);
  });

  it('should return location history for admin', async () => {
    const history = [
      {
        lat: 30.0444,
        lng: 31.2357,
        speed: 40,
        createdAt: new Date('2026-07-24T10:00:00Z'),
      },
      {
        lat: 30.05,
        lng: 31.24,
        speed: 35,
        createdAt: new Date('2026-07-24T10:05:00Z'),
      },
    ];
    locationHistoryModel.find.mockReturnValue(historyQuery);
    historyQuery.lean.mockResolvedValue(history);

    const result = await service.getLocationHistory('nurse-id', 'admin-id', UserType.ADMIN);

    expect(locationHistoryModel.find).toHaveBeenCalledWith({
      nurseId: 'nurse-id',
    });

    expect(historyQuery.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });

    expect(historyQuery.limit).toHaveBeenCalledWith(500);
    expect(result).toEqual([
      {
        lat: 30.0444,
        lng: 31.2357,
        speed: 40,
        timestamp: history[0].createdAt,
      },
      {
        lat: 30.05,
        lng: 31.24,
        speed: 35,
        timestamp: history[1].createdAt,
      },
    ]);
  });
  it('should throw NotFoundException when nurse does not exist in getLocationHistory', async () => {
    nurseModel.findById.mockResolvedValue(null);

    await expect(service.getLocationHistory('nurse-id', 'user-id', UserType.NURSE)).rejects.toThrow(
      NotFoundException,
    );

    expect(nurseModel.findById).toHaveBeenCalledWith('nurse-id');
    expect(locationHistoryModel.find).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when nurse tries to access another nurse history', async () => {
    nurseModel.findById.mockResolvedValue({
      userId: {
        toString: () => 'owner-user-id',
      },
    });

    await expect(
      service.getLocationHistory('nurse-id', 'another-user-id', UserType.NURSE),
    ).rejects.toThrow(ForbiddenException);

    expect(nurseModel.findById).toHaveBeenCalledWith('nurse-id');
    expect(locationHistoryModel.find).not.toHaveBeenCalled();
  });

  it('should return location history for the nurse owner', async () => {
    const history = [
      {
        lat: 30.0444,
        lng: 31.2357,
        speed: 40,
        createdAt: new Date('2026-07-24T10:00:00Z'),
      },
      {
        lat: 30.05,
        lng: 31.24,
        speed: 35,
        createdAt: new Date('2026-07-24T10:05:00Z'),
      },
    ];

    nurseModel.findById.mockResolvedValue({
      userId: {
        toString: () => 'owner-user-id',
      },
    });

    locationHistoryModel.find.mockReturnValue(historyQuery);
    historyQuery.lean.mockResolvedValue(history);

    const result = await service.getLocationHistory('nurse-id', 'owner-user-id', UserType.NURSE);

    expect(nurseModel.findById).toHaveBeenCalledWith('nurse-id');
    expect(locationHistoryModel.find).toHaveBeenCalledWith({
      nurseId: 'nurse-id',
    });

    expect(historyQuery.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });

    expect(historyQuery.limit).toHaveBeenCalledWith(500);

    expect(result).toEqual([
      {
        lat: 30.0444,
        lng: 31.2357,
        speed: 40,
        timestamp: history[0].createdAt,
      },
      {
        lat: 30.05,
        lng: 31.24,
        speed: 35,
        timestamp: history[1].createdAt,
      },
    ]);
  });
});
