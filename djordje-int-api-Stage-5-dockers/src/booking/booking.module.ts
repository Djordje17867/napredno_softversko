import { Module, forwardRef } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './booking.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingSchema } from './schema/bookings.schema';
import { HotelModule } from '../hotel/hotel.module';
import { TrackModule } from '../track/track.module';
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';
import { EmailsModule } from '../emails/emails.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
    forwardRef(() => HotelModule),
    forwardRef(() => TrackModule),
    WalletModule,
    UserModule,
    EmailsModule,
    BullModule.registerQueueAsync({
      name: 'requests',
    }),
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
  exports: [BookingService],
})
export class BookingModule {}
