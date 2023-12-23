import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UserIdDto {
  @IsNotEmpty()
  @ApiProperty()
  id: string;
}
