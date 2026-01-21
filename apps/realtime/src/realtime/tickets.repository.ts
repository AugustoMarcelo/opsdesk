import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { tickets } from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class TicketsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(ticketId: string) {
    const [ticket] = await this.databaseService.db
      .select({
        id: tickets.id,
        ownerId: tickets.ownerId,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    return ticket ?? null;
  }
}

