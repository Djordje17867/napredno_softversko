import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class EditSkiCenterDTO {
  @IsNotEmpty()
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  location: string;
  @ApiProperty()
  description: string;
}
