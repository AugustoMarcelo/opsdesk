import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permissions as Perm } from '../../../../packages/shared/permissions';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Users')
@Controller('/v1/users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @Post()
  @Permissions(Perm.UserCreate)
  async createUser(@Body() body: CreateUserDto) {
    return this.service.createUser(body);
  }

  @ApiOperation({ summary: 'List users' })
  @Get()
  @Permissions(Perm.UserRead)
  async list(@Query() query: ListUsersDto) {
    return this.service.listUsers(query);
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getUserById(id);
  }
}
