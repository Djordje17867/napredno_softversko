import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @ApiProperty()
  name: string;
  @IsNotEmpty()
  @ApiProperty()
  username: string;
  @IsNotEmpty()
  @ApiProperty()
  password: string;
  @IsNotEmpty()
  @ApiProperty()
  date_of_birth: Date;
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty()
  email: string;
}
