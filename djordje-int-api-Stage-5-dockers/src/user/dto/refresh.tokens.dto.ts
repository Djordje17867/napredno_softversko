import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefreshTokenDTO {
  @ApiProperty()
  @IsNotEmpty()
  refreshToken: string;
  @IsNotEmpty()
  @ApiProperty()
  id: string;
}
