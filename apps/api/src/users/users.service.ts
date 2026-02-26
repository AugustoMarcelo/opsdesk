import { userRoles } from '../db/schema/user-roles';
import { roles } from '../db/schema/roles';
import { users } from '../db/schema/users';
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
    const user = await this.databaseService.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          externalId: input.externalId,
          passwordHash,
        })
        .returning();

      if (input.roleId && created) {
        await tx.insert(userRoles).values({
          userId: created.id,
          roleId: input.roleId,
        });
      }

      return created;
    });

    return user;
  }

  async listRoles() {
    const items = await this.databaseService.db
      .select({ id: roles.id, name: roles.name })
      .from(roles);
    return { data: items };
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
