import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { MongoExceptionFilter } from './exceptionFilters/mongoExceptionFilter';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MongoExceptionFilter } from './exceptionFilters/mongoExceptionFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');

  app.useGlobalFilters(new MongoExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Hotel')
    .setDescription('The hotel API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'apiKey',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
}
bootstrap();
