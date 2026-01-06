import { ListUsersDto } from './dto/list-users.dto';
import { users } from './../db/schema/users';
import { CreateUserDto } from './dto/create-user.dto';
import { DBExecutor } from './../db/db-executor.type';
import { Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

@Injectable()
export class UsersRepository {
  async create(db: DBExecutor, data: CreateUserDto) {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        passwordHash: data.password,
      })
      .returning();

    return user;
  }

  async list(db: DBExecutor, params: ListUsersDto) {
    const { offset, limit, order } = params;

    const items = await db
      .select()
      .from(users)
      .orderBy(order === 'asc' ? asc(users.createdAt) : desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return items;
  }

  async findById(db: DBExecutor, id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));

    return user ?? null;
  }

  async findByEmail(db: DBExecutor, email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    return user ?? null;
  }
}
