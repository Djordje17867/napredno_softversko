import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { SkiCenter, SkiCenterDocument } from './schema/ski-center.schema';

export class SkiCenterRepository {
  constructor(
    @InjectModel('ski-centers')
    private readonly skiCenterModel: mongoose.Model<SkiCenter>,
  ) {}

  async create(skiCenter: SkiCenter): Promise<SkiCenterDocument> {
    return this.skiCenterModel.create(skiCenter);
  }

  async edit(
    id: string,
    query: EditSkiCenterInterface,
  ): Promise<SkiCenterDocument> {
    return this.skiCenterModel.findByIdAndUpdate(id, query, { new: true });
  }

  async delete(id: string) {
    return this.skiCenterModel.findByIdAndDelete(id, { new: true });
  }
}

interface EditSkiCenterInterface {
  name?: string;
  location?: string;
  description?: string;
}
