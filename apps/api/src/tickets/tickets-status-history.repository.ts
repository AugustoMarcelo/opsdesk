import { ticketStatusHistory } from './../db/schema/ticket-status-history';
import { DBExecutor } from './../db/db-executor.type';
import { Injectable } from '@nestjs/common';

export interface TicketStatusHistoryData {
  ticketId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string;
}

@Injectable()
export class TicketStatusHistoryRepository {
  async add(db: DBExecutor, data: TicketStatusHistoryData): Promise<void> {
    await db.insert(ticketStatusHistory).values({
      ticketId: data.ticketId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      changedBy: data.changedBy,
    });
  }
}
