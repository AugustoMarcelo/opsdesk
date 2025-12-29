import { TicketsGateway } from './tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';
import { db } from '../db/client';
import { tickets, ticketHistory } from '../db/schema';
import { Injectable } from '@nestjs/common';

type CreateTicketInput = {
  title: string;
  description: string;
  userId: string;
};

@Injectable()
export class TicketsService {
  constructor(
    private gateway: TicketsGateway,
    private auth: AuthorizationService,
  ) {}

  async createTicket(input: CreateTicketInput & { userId: string }) {
    const allowed = await this.auth.userHasPermission(
      input.userId,
      'ticket:create',
    );

    if (!allowed) {
      throw new Error('Forbidden');
    }

    const ticket = await db.transaction(async (tx) => {
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

    // 🔔 Emit event AFTER commit
    this.gateway.ticketCreated(ticket);

    return ticket;
  }
}
