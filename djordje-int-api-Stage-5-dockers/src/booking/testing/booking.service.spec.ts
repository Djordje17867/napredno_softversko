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
import { UserDocument } from '../../user/schema/user.schema';
import { BookingController } from '../booking.controller';
import { BookingRepository } from '../booking.repository';
import { HotelModule } from '../../hotel/hotel.module';
import { TrackModule } from '../../track/track.module';
import { WalletModule } from '../../wallet/wallet.module';
import { Role } from '../../user/schema/role.enum';
import { TrackService } from '../../track/track.service';
import { Rating } from '../../track/schema/rating.enum';
import { TrackDocument } from 'src/track/schema/track.schema';

describe('TrackService', () => {
  let bookingService: BookingService;
  let userService: UserService;
  class mockJwtStrategy {}
  class mockJwtRefreshStrategy {}
  const mockAuthService = {};
  const mockAWS = {};
  const mockSendgird = {
    sendConfirmationEmail: jest.fn(),
    sendApprovedEmail: jest.fn(),
    sendDeniedEmail: jest.fn(),
  };
  let skiCenterId: string;
  let user: UserDocument;
  let bookings: BookingDocument[];
  let track: TrackDocument;
  let trackService: TrackService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
        MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
        FilesModule,
        UserModule,
        EmailsModule,
        AwsModule,
        BookingModule,
        DatabaseModule,
        HotelModule,
        TrackModule,
        WalletModule,
      ],
      controllers: [BookingController],
      providers: [
        BookingService,
        BookingRepository,
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
    bookingService = moduleRef.get<BookingService>(BookingService);
    userService = moduleRef.get<UserService>(UserService);
    trackService = moduleRef.get<TrackService>(TrackService);

    skiCenterId = new mongoose.mongo.ObjectId().toString();

    track = await trackService.create({
      name: 'Track1',
      length: 120,
      rating: Rating.RED,
      price: 500,
      numOfGuests: 6,
      availableDays: ['Monday', 'Tuesday', 'Friday', 'Saturday', 'Sunday'],
      autoAccept: false,
      skiCenterId: skiCenterId,
    });

    user = await userService.create({
      _id: '651434495c7a1118476c8a42',
      name: 'Djole',
      username: 'TestBookingUser',
      password: 'Djole123@',
      isValidated: true,
      role: Role.ADMIN,
      date_of_birth: new Date('2000-11-02'),
      email: 'djoletestbooking@gmail.com',
      skiCenterId: track.skiCenterId,
      wallet: 12001,
    });
  });

  it('should create 2 booking requests', async () => {
    const price1 = await trackService.reserveTrack(user, {
      id: track.id,
      dateFrom: '2023-12-01',
      dateTo: '2023-12-04',
      numOfGuests: 4,
    });
    const price2 = await trackService.reserveTrack(user, {
      id: track.id,
      dateFrom: '2023-12-01',
      dateTo: '2023-12-04',
      numOfGuests: 4,
    });
    bookings = (await bookingService.getMyBookings(user, 10, 1, 1)).items;
    expect(price1 === price2).toEqual(true);
  });

  it('should approve one, and deny other request', async () => {
    expect(
      (await bookingService.approveRequest(bookings[0].id, user))
        .deniedRequests,
    ).toHaveLength(1);
  });
});
