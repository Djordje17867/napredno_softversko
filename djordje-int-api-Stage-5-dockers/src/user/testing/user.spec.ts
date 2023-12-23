import { Test } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import * as mongoose from 'mongoose';
import { User, UserDocument, UserSchema } from '../schema/user.schema';
import { AuthService } from '../../auth/auth.service';
import { UserRepository } from '../user.repository';
import { AWSService } from '../../aws/aws.service';
import { SendgridService } from '../../emails/sendgrid.service';
import { Role } from '../schema/role.enum';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingSchema } from '../../booking/schema/bookings.schema';
import { FileSchema } from '../../files/schemas/file.schema';
import { confirmationTokenSchema } from '../schema/confirmation.tokens.schema';
import { refreshTokenSchema } from '../schema/refreshToken.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AwsModule } from '../../aws/aws.module';
import { EmailsModule } from '../../emails/emails.module';
import { FilesModule } from '../../files/files.module';
import { WalletModule } from '../../wallet/wallet.module';
import { JwtService } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { RefreshTokenStrategy } from '../../auth/strategies/jwt.refresh.strategy';
import { MockModule } from '../../test/mock.database.module';

describe('UserService', () => {
  // let userController: UserController;
  let userService: UserService;
  let id;
  let user: UserDocument;
  let user1: UserDocument;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AwsModule,
        EmailsModule,
        WalletModule,
        AuthModule,
        ConfigModule,
        DatabaseModule,
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
        MongooseModule.forFeature([
          { name: 'Token', schema: refreshTokenSchema },
        ]),
        MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
        MongooseModule.forFeature([
          { name: 'ConfirmationToken', schema: confirmationTokenSchema },
        ]),
        MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
      ],
      controllers: [UserController],
      providers: [
        ConfigService,
        UserService,
        UserRepository,
        JwtService,
        {
          provide: JwtStrategy,
          useClass: mockJwtStrategy,
        },
        {
          provide: RefreshTokenStrategy,
          useClass: mockJwtRefreshStrategy,
        },
        ConfigModule,
        FilesModule,
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

    // userController = moduleRef.get<UsgierController>(UserController);
    userService = moduleRef.get<UserService>(UserService);
  });

  it('should create user', async () => {
    const dto: User = {
      _id: '651434495c7a1418476c8a25',
      name: 'Djole',
      username: 'djole123',
      password: 'Djole123@',
      isValidated: true,
      role: Role.ADMIN,
      date_of_birth: new Date('2000-11-02'),
      email: 'djole@gmail.com',
      skiCenterId: '123',
    };
    user = await userService.create(dto);
    id = user.id;
    dto.email = 'djole2@gmail.com';
    dto.username = 'djole1234';
    dto._id = new mongoose.mongo.ObjectId().toString();
    expect(await userService.create(dto));
  });

  it('should retrive user', async () => {
    expect(await userService.findUserById(id)).toBeDefined();
  });

  it('should not find user', async () => {
    try {
      await userService.findUserById(new mongoose.mongo.ObjectId().toString());
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
    }
  });

  it('should throw weak password error', async () => {
    try {
      await userService.changePassword(user, 'Djole123@', 'Djole1234');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
    }
  });

  it('should throw wrong pass error', async () => {
    try {
      await userService.changePassword(user, 'Djole123', 'Djole1234@');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
    }
  });

  it('should change pass', async () => {
    const password = user.password;
    user1 = await userService.changePassword(
      user,
      'Djole123@',
      'Anisdoadnasd1@',
    );
    expect(user1.password === password).toBe(false);
  });

  it('should return users', async () => {
    const users = await userService.findAll(50, 1, 1, 1);
    expect(users.totalItems).toBeGreaterThanOrEqual(2);
  });

  it('should add credits', async () => {
    user = await userService.addCredits(user.id, 10000);
    expect(user.wallet).toEqual(10000);
  });

  it('should delete user', async () => {
    expect(await userService.delete(user1)).toBeDefined();
  });

  const mockAuthService = {};
  const mockAWS = {};
  const mockSendgird = {
    sendConfirmationEmail: jest.fn(),
  };
  class mockJwtStrategy {}
  class mockJwtRefreshStrategy {}
});
