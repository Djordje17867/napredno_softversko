import { Module } from '@nestjs/common';
import { AdminSeed } from './admin.seed';
import { UserModule } from '../user/user.module';
import { DataSeed } from './seed.data';
import { TrackModule } from 'src/track/track.module';
import { HotelModule } from 'src/hotel/hotel.module';
import { SkiCenterModule } from 'src/ski-center/ski-center.module';

@Module({
  imports: [UserModule, TrackModule, HotelModule, SkiCenterModule],
  providers: [AdminSeed, DataSeed],
  exports: [AdminSeed, DataSeed],
})
export class SeedsModule {}
