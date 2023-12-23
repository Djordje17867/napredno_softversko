import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../user/schema/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
