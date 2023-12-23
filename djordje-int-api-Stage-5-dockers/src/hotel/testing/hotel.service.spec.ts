import { Test } from '@nestjs/testing';
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
import { RefreshTokenStrategy } from '../../auth/strategies/jwt.refresh.strategy';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { DatabaseModule } from '../../database/database.module';
import { AuthService } from '../../auth/auth.service';
import { AWSService } from '../../aws/aws.service';
import { SendgridService } from '../../emails/sendgrid.service';
import { MockModule } from '../../test/mock.database.module';
import mongoose from 'mongoose';
import { BookingService } from '../../booking/booking.service';
import { UserService } from '../../user/user.service';
import { Role } from '../../user/schema/role.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HotelService } from '../hotel.service';
import { HotelDocument, HotelSchema } from '../schema/hotel.schema';
import { HotelController } from '../hotel.controller';
import { HotelRepository } from '../hotel.repository';
import { UserDocument } from 'src/user/schema/user.schema';

describe('TrackService', () => {
  let hotelService: HotelService;
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
  let hotel: HotelDocument;
  let bookings: BookingDocument[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{ name: 'Hotel', schema: HotelSchema }]),
        MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
        MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
        FilesModule,
        UserModule,
        EmailsModule,
        AwsModule,
        BookingModule,
        DatabaseModule,
      ],
      controllers: [HotelController],
      providers: [
        HotelService,
        HotelRepository,
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
    hotelService = moduleRef.get<HotelService>(HotelService);
    bookingService = moduleRef.get<BookingService>(BookingService);
    userService = moduleRef.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(hotelService).toBeDefined();
  });

  it('should create hotel', async () => {
    skiCenterId = new mongoose.mongo.ObjectId().toString();
    const dto = {
      name: 'Hotel1',
      address: 'aaaaa',
      price: 500,
      numOfGuests: 10,
      availableDays: ['Monday', 'Tuesday', 'Friday', 'Saturday', 'Sunday'],
      autoAccept: true,
      numOfStars: 4,
      skiCenterId: skiCenterId,
    };
    hotel = await hotelService.create(dto);
    expect(hotel.price).toEqual(500);
  });

  it('should make reservation', async () => {
    user = await userService.create({
      _id: '651434495c7a1418476c8a23',
      name: 'Djole',
      username: 'djole12345',
      password: 'Djole123@',
      isValidated: true,
      role: Role.ADMIN,
      date_of_birth: new Date('2000-11-02'),
      email: 'djole4@gmail.com',
      skiCenterId: hotel.skiCenterId,
      wallet: 10000,
    });
    const price = await hotelService.reserveHotel(user, {
      id: hotel.id,
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
      const price = await hotelService.reserveHotel(user, {
        id: hotel.id,
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
      const price = await hotelService.reserveHotel(user, {
        id: hotel.id,
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

  it('should not find hotel', async () => {
    expect(
      (
        await hotelService.getAll(
          10,
          1,
          1,
          '',
          5,
          null,
          200,
          800,
          null,
          null,
          3,
        )
      ).totalItems,
    ).toEqual(0);
  });
  it('should delete', async () => {
    await hotelService.delete(hotel.id, user);
    expect(
      (
        await hotelService.getAll(
          10,
          1,
          1,
          '',
          null,
          null,
          null,
          null,
          null,
          null,
          3,
        )
      ).totalItems,
    ).toEqual(0);
  });
});
