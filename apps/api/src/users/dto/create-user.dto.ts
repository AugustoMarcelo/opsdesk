import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'jonhdue@example.com',
    description: 'Email of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123456', description: "Password's user" })
  @IsString()
  password: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000000',
    description: 'Role ID of the user',
  })
  @IsUUID()
  roleId?: string;

  @ApiProperty({
    example: '123456',
    description: 'External ID. Keycloak for this current solution',
  })
  @IsString()
  externalId?: string;
}
