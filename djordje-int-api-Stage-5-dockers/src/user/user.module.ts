import {
  MiddlewareConsumer,
  Module,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSchema } from './schema/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRepository } from './user.repository';
import { JwtService } from '@nestjs/jwt';
import { refreshTokenSchema } from './schema/refreshToken.schema';
import { confirmationTokenSchema } from './schema/confirmation.tokens.schema';
import { ApiKeyMiddleware } from '../middleware/add-credits-api-key.middleware';
import { BookingSchema } from '../booking/schema/bookings.schema';
import { FileSchema } from '../files/schemas/file.schema';
import { MakeAdminApiKey } from '../middleware/make-admin-api-key.middleware';
import { FilesModule } from '../files/files.module';
import { AuthModule } from '../auth/auth.module';
import { AwsModule } from '../aws/aws.module';
import { EmailsModule } from '../emails/emails.module';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    FilesModule,
    AwsModule,
    EmailsModule,
    WalletModule,
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    MongooseModule.forFeature([{ name: 'Token', schema: refreshTokenSchema }]),
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
    MongooseModule.forFeature([
      { name: 'ConfirmationToken', schema: confirmationTokenSchema },
    ]),
    MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
  ],
  providers: [UserService, UserRepository, JwtService, ConfigService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes('users/addCredits');
    consumer.apply(MakeAdminApiKey).forRoutes('/users/admin');
  }
}
