import { TicketCreatedEvent } from '../../../../libs/events/ticket-created.event';
import { TicketsGateway } from './tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';
import { db } from '../db/client';
import {
  tickets,
  ticketHistory,
  ticketStatusHistory,
  auditLog,
} from '../db/schema';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { redis } from '../cache/redis.client';
import { asc, desc, eq, type InferSelectModel } from 'drizzle-orm';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { ListTicketsDto } from './dto/list-tickets.dto';

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
      throw new ForbiddenException('User not authorized to create tickets');
    }

    const ticket = await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({
          title: input.title,
          description: input.description,
          status: 'open',
          ownerId: input.userId,
        })
        .returning();

      await tx.insert(ticketHistory).values({
        ticketId: ticket.id,
        action: 'CREATED',
      });

      await tx.insert(ticketStatusHistory).values({
        ticketId: ticket.id,
        oldStatus: null,
        newStatus: 'open',
        changedBy: input.userId,
      });

      await tx.insert(auditLog).values({
        entityType: 'ticket',
        entityId: ticket.id,
        action: 'ticket.created',
        metadata: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
        }),
        performedBy: input.userId,
      });

      return ticket;
    });

    this.rabbit.publish<TicketCreatedEvent>('ticket.created', {
      event: 'ticket.created',
      payload: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        ownerId: ticket.ownerId,
        createdAt: ticket.createdAt.toISOString(),
      },
    });

    // 🔔 Emit event AFTER commit
    this.gateway.ticketCreated(ticket);

    await redis.del('tickets:all');

    return ticket;
  }

  async listTickets(query: ListTicketsDto) {
    const { offset, limit, order } = query;

    const cacheKey = `tickets:all:offset:${offset}:limit:${limit}:order:${order}`;

    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as Ticket[];
    }

    const items = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        ownerId: tickets.ownerId,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .orderBy(
        order === 'asc' ? asc(tickets.createdAt) : desc(tickets.createdAt),
      )
      .limit(limit)
      .offset(offset);

    const response = {
      data: items,
      meta: {
        limit,
        offset,
        count: items.length,
      },
    };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', 30); // Cache for 30 seconds

    return response;
  }

  async getTicketById(id: string) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return { data: ticket };
  }
}
