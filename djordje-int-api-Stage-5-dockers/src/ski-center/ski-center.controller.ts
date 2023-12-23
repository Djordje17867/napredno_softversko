import { Body, Controller, Delete, Patch, Post } from '@nestjs/common';
import { SkiCenter, SkiCenterDocument } from './schema/ski-center.schema';
import { SkiCenterService } from './ski-center.service';
import { EditSkiCenterDTO } from './schema/edit.ski.center.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSkiCenterDTO } from './schema/create.ski.center.dto';
import { UserIdDto } from 'src/user/dto/user.id.dto';

@Controller('ski-centers')
@ApiTags('Ski center')
export class SkiCenterController {
  constructor(private readonly skiCenterService: SkiCenterService) {}

  @ApiOperation({ security: [{ apiKey: [] }] })
  @ApiBody({ type: CreateSkiCenterDTO })
  @Post()
  async createSkiCenter(@Body() skiCenter: SkiCenter) {
    return this.skiCenterService.create(skiCenter);
  }

  @ApiOperation({ security: [{ apiKey: [] }] })
  @Patch()
  @ApiBody({ type: EditSkiCenterDTO })
  async editSkiCenter(@Body() editSkiCenterDTO: EditSkiCenterDTO) {
    return this.skiCenterService.edit(editSkiCenterDTO.id, editSkiCenterDTO);
  }

  @ApiOperation({ security: [{ apiKey: [] }] })
  @ApiBody({ type: UserIdDto })
  @Delete()
  async deleteSkiCenter(
    @Body() userIdDto: UserIdDto,
  ): Promise<SkiCenterDocument> {
    return this.skiCenterService.delete(userIdDto.id);
  }
}
