import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ConfirmEmailDTO {
  @ApiProperty()
  @IsNotEmpty()
  code: string;
  @IsNotEmpty()
  @ApiProperty()
  id: string;
}
