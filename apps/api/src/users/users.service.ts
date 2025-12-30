import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq, asc, desc } from 'drizzle-orm';

@Injectable()
export class UsersService {
  async createUser(input: CreateUserDto) {
    const [user] = await db.insert(users).values(input).returning();

    return user;
  }

  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async listUsers(query: ListUsersDto) {
    const { offset, limit, order } = query;

    const items = await db
      .select()
      .from(users)
      .orderBy(order === 'asc' ? asc(users.createdAt) : desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return { data: items, meta: { offset, limit, count: items.length } };
  }
}
