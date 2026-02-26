import { ticketHistory } from './../db/schema/ticket-history';
import { DBExecutor } from '../db/db-executor.type';
import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

export interface TicketHistoryData {
  ticketId: string;
  action: string;
}

@Injectable()
export class TicketHistoryRepository {
  async add(db: DBExecutor, data: TicketHistoryData): Promise<void> {
    await db.insert(ticketHistory).values({
      ticketId: data.ticketId,
      action: data.action,
    });
  }

  async findByTicketId(db: DBExecutor, ticketId: string) {
    return db
      .select()
      .from(ticketHistory)
      .where(eq(ticketHistory.ticketId, ticketId))
      .orderBy(asc(ticketHistory.createdAt));
  }
}
