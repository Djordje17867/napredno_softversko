import { Test } from '@nestjs/testing';
import { TrackService } from '../track.service';
import { TrackController } from '../track.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AwsModule } from '../../aws/aws.module';
import { BookingModule } from '../../booking/booking.module';
import {
  BookingDocument,
  BookingSchema,
} from '../../booking/schema/bookings.schema';
import { EmailsModule } from '../../emails/emails.module';
import { FilesModule } from '../../files/files.module';
import { FileSchema } from '../../files/schemas/file.schema';
import { UserModule } from '../../user/user.module';
import { TrackDocument, TrackSchema } from '../schema/track.schema';
import { TrackRepository } from '../track.repository';
import { RefreshTokenStrategy } from '../../auth/strategies/jwt.refresh.strategy';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { DatabaseModule } from '../../database/database.module';
import { AuthService } from '../../auth/auth.service';
import { AWSService } from '../../aws/aws.service';
import { SendgridService } from '../../emails/sendgrid.service';
import { MockModule } from '../../test/mock.database.module';
import { Rating } from '../schema/rating.enum';
import mongoose from 'mongoose';
import { BookingService } from '../../booking/booking.service';
import { UserService } from '../../user/user.service';
import { Role } from '../../user/schema/role.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserDocument } from '../../user/schema/user.schema';

describe('TrackService', () => {
  let trackService: TrackService;
  let bookingService: BookingService;
  let userService: UserService;
  class mockJwtStrategy {}
  class mockJwtRefreshStrategy {}
  const mockAuthService = {};
  const mockAWS = {};
  const mockSendgird = {
    sendConfirmationEmail: jest.fn(),
    sendApprovedEmail: jest.fn(),
  };
  let skiCenterId: string;
  let user: UserDocument;
  let track: TrackDocument;
  let bookings: BookingDocument[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{ name: 'Track', schema: TrackSchema }]),
        MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
        MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
        FilesModule,
        UserModule,
        EmailsModule,
        AwsModule,
        BookingModule,
        DatabaseModule,
      ],
      controllers: [TrackController],
      providers: [
        TrackService,
        TrackRepository,
        {
          provide: JwtStrategy,
          useClass: mockJwtStrategy,
        },
        {
          provide: RefreshTokenStrategy,
          useClass: mockJwtRefreshStrategy,
        },
      ],
    })
      .overrideModule(DatabaseModule)
      .useModule(MockModule)
      .overrideProvider(JwtStrategy)
      .useValue({})
      .overrideProvider(RefreshTokenStrategy)
      .useValue({})
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider(AWSService)
      .useValue(mockAWS)
      .overrideProvider(SendgridService)
      .useValue(mockSendgird)
      .compile();
    trackService = moduleRef.get<TrackService>(TrackService);
    bookingService = moduleRef.get<BookingService>(BookingService);
    userService = moduleRef.get<UserService>(UserService);
  });

  it('should create track', async () => {
    skiCenterId = new mongoose.mongo.ObjectId().toString();
    const dto = {
      name: 'Track1',
      length: 120,
      rating: Rating.RED,
      price: 500,
      numOfGuests: 10,
      availableDays: ['Monday', 'Tuesday', 'Friday', 'Saturday', 'Sunday'],
      autoAccept: true,
      skiCenterId: skiCenterId,
    };
    track = await trackService.create(dto);
    expect(track.price).toEqual(500);
  });

  it('should make reservation', async () => {
    user = await userService.create({
      _id: '651434495c7a1418476c8a24',
      name: 'Djole',
      username: 'djole1233',
      password: 'Djole123@',
      isValidated: true,
      role: Role.ADMIN,
      date_of_birth: new Date('2000-11-02'),
      email: 'djole3@gmail.com',
      skiCenterId: track.skiCenterId,
      wallet: 10000,
    });
    const price = await trackService.reserveTrack(user, {
      id: track.id,
      dateFrom: '2023-12-01',
      dateTo: '2023-12-04',
      numOfGuests: 4,
    });
    expect(price).toEqual(6000);
  });

  it('should return booking', async () => {
    bookings = (await bookingService.getMyBookings(user, 50, 1, 1)).items;
    expect(bookings).toBeDefined();
  });

  it('should not be able to reserve', async () => {
    try {
      const price = await trackService.reserveTrack(user, {
        id: track.id,
        dateFrom: '2023-12-06',
        dateTo: '2023-12-07',
        numOfGuests: 4,
      });
      expect(price).toBeUndefined();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
    }
  });

  it('should not be able to reserve, no money', async () => {
    try {
      const price = await trackService.reserveTrack(user, {
        id: track.id,
        dateFrom: '2023-12-08',
        dateTo: '2023-12-12',
        numOfGuests: 6,
      });
      expect(price).toBeUndefined();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
    }
  });

  it('should refund booking', async () => {
    user = await bookingService.refund(user, bookings[0].id);
    expect(user.wallet).toEqual(10000);
  });

  it('should not find track', async () => {
    expect(
      (
        await trackService.getAll(
          10,
          1,
          1,
          1,
          null,
          200,
          250,
          null,
          null,
          null,
          null,
          null,
          null,
        )
      ).totalItems,
    ).toEqual(0);
  });

  it('should delete track', async () => {
    await trackService.delete(track.id, user);
    expect(
      (
        await trackService.getAll(
          50,
          1,
          1,
          1,
          '',
          0,
          150,
          Rating.RED,
          10,
          1000,
          null,
          null,
          1,
        )
      ).totalItems,
    ).toBeLessThanOrEqual(1);
  });
});
