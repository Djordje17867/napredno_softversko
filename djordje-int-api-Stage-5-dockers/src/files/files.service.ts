import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { File, FileDocument } from './schemas/file.schema';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel('Files')
    private readonly filesModel: mongoose.Model<File>,
  ) {}

  async addPicture(file: File): Promise<FileDocument> {
    return await this.filesModel.create(file);
  }
}
