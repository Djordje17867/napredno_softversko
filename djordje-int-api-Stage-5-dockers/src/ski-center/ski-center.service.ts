import { BadRequestException, Injectable } from '@nestjs/common';
import { SkiCenterRepository } from './ski-center-repository';
import { SkiCenter, SkiCenterDocument } from './schema/ski-center.schema';
import { EditSkiCenterDTO } from './schema/edit.ski.center.dto';

@Injectable()
export class SkiCenterService {
  constructor(private readonly skiCenterRepository: SkiCenterRepository) {}

  async create(skiCenter: SkiCenter): Promise<SkiCenterDocument> {
    return this.skiCenterRepository.create(skiCenter);
  }

  async edit(
    id: string,
    editSkiCenterDTO: EditSkiCenterDTO,
  ): Promise<SkiCenterDocument> {
    const query: any = {};
    if (editSkiCenterDTO.name) query.name = editSkiCenterDTO.name;
    if (editSkiCenterDTO.location) query.location = editSkiCenterDTO.location;
    if (editSkiCenterDTO.description)
      query.description = editSkiCenterDTO.description;

    if (Object.keys(query).length === 0)
      throw new BadRequestException('No changes commited');

    return this.skiCenterRepository.edit(id, query);
  }

  async delete(id: string) {
    return this.skiCenterRepository.delete(id);
  }
}
