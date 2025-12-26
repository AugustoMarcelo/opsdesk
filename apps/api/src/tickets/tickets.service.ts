import { db } from '../db/client';
import { tickets, ticketHistory } from '../db/schema';
import { eq } from 'drizzle-orm';

type CreateTicketInput = {
  title: string;
  description: string;
  ownerId: string;
};

export class TicketsService {
  async createTicket(input: CreateTicketInput) {
    return db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({
          title: input.title,
          description: input.description,
          ownerId: input.ownerId,
        })
        .returning();

      await tx.insert(ticketHistory).values({
        ticketId: ticket.id,
        action: 'CREATED',
      });

      return ticket;
    });
  }
}
