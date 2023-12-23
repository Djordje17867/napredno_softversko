import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AddHotelDto {
  @IsNotEmpty()
  @ApiProperty()
  name: string;
  @IsNotEmpty()
  @ApiProperty()
  address: string;
  @IsNotEmpty()
  @ApiProperty()
  numOfGuests: number;
  @IsNotEmpty()
  @ApiProperty()
  numOfStars: number;
  @IsNotEmpty()
  @ApiProperty()
  price: number;
  @IsNotEmpty()
  @ApiProperty()
  availableDays: [string];
  @IsNotEmpty()
  @ApiProperty()
  autoAccept: boolean;
}
