import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the ticket this message belongs to',
  })
  @IsUUID()
  ticketId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the user sending the message',
  })
  @IsUUID()
  authorId!: string;

  @ApiProperty({
    example: 'This is a message about the ticket',
    description: 'Content of the message',
  })
  @IsString()
  @MinLength(1)
  content!: string;
}
