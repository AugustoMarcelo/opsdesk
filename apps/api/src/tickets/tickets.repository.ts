import { ListTicketsDto } from './dto/list-tickets.dto';
import { type DBExecutor } from './../db/db-executor.type';
import { tickets } from '../db/schema';
import { Injectable } from '@nestjs/common';
import { asc, desc, eq, InferSelectModel } from 'drizzle-orm';

type CreateTicketInput = {
  title: string;
  description: string;
  status?: 'open' | 'closed';
  userId: string;
};

type UpdateTicketInput = {
  title?: string;
  description?: string;
  status?: 'open' | 'closed';
};

export type Ticket = InferSelectModel<typeof tickets>;

@Injectable()
export class TicketsRepository {
  async create(db: DBExecutor, data: CreateTicketInput) {
    const [ticket] = await db
      .insert(tickets)
      .values({
        title: data.title,
        description: data.description,
        status: data.status ?? 'open',
        ownerId: data.userId,
      })
      .returning();

    return ticket;
  }

  async list(db: DBExecutor, params: ListTicketsDto): Promise<Ticket[]> {
    const { order, limit, offset } = params;

    const items = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        status: tickets.status,
        ownerId: tickets.ownerId,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .orderBy(
        order === 'asc' ? asc(tickets.createdAt) : desc(tickets.createdAt),
      )
      .limit(limit)
      .offset(offset);

    return items;
  }

  async findById(db: DBExecutor, id: string) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));

    return ticket ?? null;
  }

  async updateTicket(
    db: DBExecutor,
    id: string,
    data: UpdateTicketInput,
  ): Promise<void> {
    await db
      .update(tickets)
      .set({
        title: data.title,
        description: data.description,
        status: data.status,
      })
      .where(eq(tickets.id, id));
  }
}
