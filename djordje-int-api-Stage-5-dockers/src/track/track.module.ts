import { Module, forwardRef } from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { TrackRepository } from './track.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { TrackSchema } from './schema/track.schema';
import { BookingSchema } from '../booking/schema/bookings.schema';
import { FileSchema } from '../files/schemas/file.schema';
import { FilesModule } from '../files/files.module';
import { UserModule } from '../user/user.module';
import { BookingModule } from '../booking/booking.module';
import { AwsModule } from '../aws/aws.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Track', schema: TrackSchema }]),
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
    MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }]),
    FilesModule,
    UserModule,
    EmailsModule,
    AwsModule,
    forwardRef(() => BookingModule),
  ],
  controllers: [TrackController],
  providers: [TrackService, TrackRepository],
  exports: [TrackService, TrackRepository],
})
export class TrackModule {}
