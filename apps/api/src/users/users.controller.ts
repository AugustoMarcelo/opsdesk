import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  async createUser(@Body() body: CreateUserDto) {
    return this.service.createUser(body);
  }

  @Get()
  async list(@Query() query: ListUsersDto) {
    return this.service.listUsers(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getUserById(id);
  }
}
