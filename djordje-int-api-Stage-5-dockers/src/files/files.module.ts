import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema } from './schemas/file.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Files', schema: FileSchema }])],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
