import { Module, forwardRef } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { HotelController } from './hotel.controller';
import { HotelSchema } from './schema/hotel.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelRepository } from './hotel.repository';
import { BookingSchema } from '../booking/schema/bookings.schema';
import { FileSchema } from '../files/schemas/file.schema';
import { FilesModule } from '../files/files.module';
import { UserModule } from '../user/user.module';
import { BookingModule } from '../booking/booking.module';
import { AwsModule } from '../aws/aws.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    forwardRef(() => BookingModule),
    UserModule,
    FilesModule,
    AwsModule,
    EmailsModule,
    MongooseModule.forFeature([{ name: 'Hotel', schema: HotelSchema }]),
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
    MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
  ],
  providers: [HotelService, HotelRepository],
  controllers: [HotelController],
  exports: [HotelService],
})
export class HotelModule {}
