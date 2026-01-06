import { ticketHistory } from './../db/schema/ticket-history';
import { DBExecutor } from '../db/db-executor.type';
import { Injectable } from '@nestjs/common';

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
}
