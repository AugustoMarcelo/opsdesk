import { UsersRepository } from './users.repository';
import { DatabaseService } from './../db/database.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { hash } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async createUser(input: CreateUserDto) {
    const passwordHash = await hash(input.password, 10);
    const user = await this.usersRepo.create(this.databaseService.db, {
      ...input,
      password: passwordHash,
    });

    return user;
  }

  async getUserById(id: string) {
    const user = await this.usersRepo.findById(this.databaseService.db, id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async listUsers(query: ListUsersDto) {
    const { offset, limit } = query;

    const items = await this.usersRepo.list(this.databaseService.db, query);

    return { data: items, meta: { offset, limit, count: items.length } };
  }
}
