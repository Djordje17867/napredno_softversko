import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SkiCenterController } from './ski-center.controller';
import { SkiCenterService } from './ski-center.service';
import { MakeSkiCenterMiddlware } from 'src/middleware/make-ski-center-api-key.middleware';
import { SkiCenterRepository } from './ski-center-repository';
import { MongooseModule } from '@nestjs/mongoose';
import { skiCenterSchema } from './schema/ski-center.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ski-centers', schema: skiCenterSchema },
    ]),
  ],
  controllers: [SkiCenterController],
  providers: [SkiCenterService, SkiCenterRepository],
  exports: [SkiCenterService],
})
export class SkiCenterModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MakeSkiCenterMiddlware).forRoutes('ski-centers');
  }
}
