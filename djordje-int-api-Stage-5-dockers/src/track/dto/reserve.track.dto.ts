import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ReserveTrackDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;
  @IsNotEmpty()
  @ApiProperty()
  dateFrom: string;
  @IsNotEmpty()
  @ApiProperty()
  dateTo: string;
  @IsNotEmpty()
  @ApiProperty()
  numOfGuests: number;
}
