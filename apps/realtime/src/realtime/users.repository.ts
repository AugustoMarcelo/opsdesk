import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service';
import { users } from '../db/schema';

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByExternalId(externalId: string) {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.externalId, externalId))
      .limit(1);

    return user ?? null;
  }

  async create(data: {
    externalId: string;
    email: string;
    name: string;
    passwordHash: string;
  }) {
    const [user] = await this.databaseService.db
      .insert(users)
      .values({
        externalId: data.externalId,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      })
      .returning();

    return user;
  }
}

