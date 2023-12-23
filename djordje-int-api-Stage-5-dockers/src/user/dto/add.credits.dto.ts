import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class addCreditsDTO {
  @IsNotEmpty()
  @ApiProperty()
  id: string;
  @IsNotEmpty()
  @ApiProperty()
  amount: number;
}
