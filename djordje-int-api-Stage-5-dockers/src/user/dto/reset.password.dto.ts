import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @ApiProperty()
  code: string;
  @IsNotEmpty()
  @ApiProperty()
  newPassword: string;
}
