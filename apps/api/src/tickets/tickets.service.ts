import { AuthorizationService } from '../auth/authorization.service';
import { db } from '../db/client';
import { tickets, ticketHistory } from '../db/schema';

type CreateTicketInput = {
  title: string;
  description: string;
  userId: string;
};

export class TicketsService {
  private auth = new AuthorizationService();

  async createTicket(input: CreateTicketInput & { userId: string }) {
    const allowed = await this.auth.userHasPermission(
      input.userId,
      'ticket:create',
    );

    if (!allowed) {
      throw new Error('Forbidden');
    }

    return db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({
          title: input.title,
          description: input.description,
          ownerId: input.userId,
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
