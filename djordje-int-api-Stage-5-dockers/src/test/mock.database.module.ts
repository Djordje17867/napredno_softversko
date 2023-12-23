import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => ({
        uri: (global as any).__MONGO_URI__,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [ConfigService],
})
export class MockModule {}
