import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { HotelModule } from './hotel/hotel.module';
import { TrackModule } from './track/track.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AdminSeed } from './seeders/admin.seed';
import { CommandModule } from 'nestjs-command';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { DataSeed } from './seeders/seed.data';
import { SkiCenterModule } from './ski-center/ski-center.module';
import { BookingModule } from './booking/booking.module';
import { WalletModule } from './wallet/wallet.module';
import { AwsModule } from './aws/aws.module';
import { EmailsModule } from './emails/emails.module';
import { BullModule } from '@nestjs/bull';
import { RequestConsumer } from './booking/bull/bull.consumer';

@Module({
  imports: [
    UserModule,
    HotelModule,
    TrackModule,
    DatabaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommandModule,
    AuthModule,
    FilesModule,
    SkiCenterModule,
    BookingModule,
    WalletModule,
    AwsModule,
    EmailsModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT),
        },
      }),
    }),
  ],
  controllers: [],
  providers: [AdminSeed, DataSeed, RequestConsumer],
})
export class AppModule {}
