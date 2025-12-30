import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListTicketsDto {
  @ApiProperty({
    example: 0,
    required: false,
    description: 'Number of items to skip',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;

  @ApiProperty({
    example: 20,
    required: false,
    description: 'Number of items to return',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiProperty({
    example: 'desc',
    required: false,
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Order of the tickets based on creation date',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
