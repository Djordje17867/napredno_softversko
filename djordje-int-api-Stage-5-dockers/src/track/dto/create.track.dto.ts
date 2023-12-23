import { IsNotEmpty } from 'class-validator';
import { Rating } from '../schema/rating.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTrackDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  @ApiProperty()
  length: number;
  @IsNotEmpty()
  @ApiProperty()
  rating: Rating;
  @IsNotEmpty()
  @ApiProperty()
  price: number;
  @IsNotEmpty()
  @ApiProperty()
  numOfGuests: number;
  @IsNotEmpty()
  @ApiProperty()
  availableDays: [string];
  @IsNotEmpty()
  @ApiProperty()
  autoAccept: boolean;
}
