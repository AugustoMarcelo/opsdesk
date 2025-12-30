import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'Login error' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'User cannot log in' })
  @IsString()
  @MinLength(5)
  description!: string;
}
