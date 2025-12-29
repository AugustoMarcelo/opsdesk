import { TicketsGateway } from './tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';
import { db } from '../db/client';
import { tickets, ticketHistory } from '../db/schema';
import { Injectable } from '@nestjs/common';
import { redis } from '../cache/redis.client';
import type { InferSelectModel } from 'drizzle-orm';
import { RabbitMQService } from '../messaging/rabbitmq.service';

type CreateTicketInput = {
  title: string;
  description: string;
  userId: string;
};

type Ticket = InferSelectModel<typeof tickets>;

@Injectable()
export class TicketsService {
  constructor(
    private gateway: TicketsGateway,
    private auth: AuthorizationService,
    private readonly rabbit: RabbitMQService,
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

    this.rabbit.publish('ticket.created', ticket);

    // 🔔 Emit event AFTER commit
    this.gateway.ticketCreated(ticket);

    await redis.del('tickets:all');

    return ticket;
  }

  async listTickets() {
    const cacheKey = 'tickets:all';

    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as Ticket[];
    }

    const data = await db.select().from(tickets);

    await redis.set(cacheKey, JSON.stringify(data), 'EX', 30); // Cache for 30 seconds

    return data;
  }
}
