import { TicketHistoryRepository } from './tickets-history.repository';
import { AuditRepository } from './../audit/audit.repository';
import { TicketStatusHistoryRepository } from './tickets-status-history.repository';
import { Ticket, TicketsRepository } from './tickets.repository';
import { TicketCreatedEvent } from '../../../../packages/events/ticket-created.event';
import { TicketsGateway } from './tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { redis } from '../cache/redis.client';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { canAccessTicket } from '../auth/ownership';
import { DatabaseService } from '../db/database.service';

type CreateTicketInput = {
  title: string;
  description: string;
  userId: string;
};

type UpdateTicketInput = {
  title?: string;
  description?: string;
  user: { id: string; roles: string[] };
};

type UpdateTicketStatusInput = {
  status: 'open' | 'closed';
  user: { id: string; roles: string[] };
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ticketsRepo: TicketsRepository,
    private readonly ticketHistoryRepo: TicketHistoryRepository,
    private readonly statusHistoryRepo: TicketStatusHistoryRepository,
    private readonly auditRepo: AuditRepository,
    private gateway: TicketsGateway,
    private auth: AuthorizationService,
    private readonly rabbit: RabbitMQService,
  ) {}

  async createTicket(input: CreateTicketInput) {
    const allowed = await this.auth.userHasPermission(
      input.userId,
      'ticket:create',
    );

    if (!allowed) {
      throw new ForbiddenException('User not authorized to create tickets');
    }

    const ticket = await this.databaseService.db.transaction(async (tx) => {
      const ticket = await this.ticketsRepo.create(tx, {
        title: input.title,
        description: input.description,
        status: 'open',
        userId: input.userId,
      });

      await this.ticketHistoryRepo.add(tx, {
        ticketId: ticket.id,
        action: 'CREATED',
      });

      await this.statusHistoryRepo.add(tx, {
        ticketId: ticket.id,
        oldStatus: null,
        newStatus: 'open',
        changedBy: input.userId,
      });

      await this.auditRepo.log(tx, {
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

    const createdTicketEvent: TicketCreatedEvent = {
      event: 'ticket.created',
      payload: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        ownerId: ticket.ownerId,
        createdAt: ticket.createdAt.toISOString(),
      },
    };

    this.rabbit.publish<TicketCreatedEvent>(
      'ticket.created',
      createdTicketEvent,
    );

    // 🔔 Emit event AFTER commit
    this.gateway.ticketCreated(createdTicketEvent);

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

    const items = await this.ticketsRepo.list(this.databaseService.db, query);

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

  async getTicketById(id: string, user: { id: string; roles: string[] }) {
    const ticket = await this.ticketsRepo.findById(this.databaseService.db, id);

    if (!ticket || !canAccessTicket(user, ticket)) {
      throw new NotFoundException('Ticket not found');
    }

    return { data: ticket };
  }

  async updateTicket(
    id: string,
    { title, description, user }: UpdateTicketInput,
  ) {
    const ticket = await this.ticketsRepo.findById(this.databaseService.db, id);

    if (!ticket || !canAccessTicket(user, ticket)) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new ConflictException('Ticket already closed');
    }

    await this.databaseService.db.transaction(async (tx) => {
      await this.ticketsRepo.updateTicket(tx, id, {
        title,
        description,
      });

      await this.auditRepo.log(tx, {
        entityType: 'ticket',
        entityId: id,
        action: 'ticket.updated',
        performedBy: user.id,
        metadata: JSON.stringify({
          title,
          description,
        }),
      });
    });
  }

  async updateTicketStatus(
    id: string,
    { status, user }: UpdateTicketStatusInput,
  ) {
    const ticket = await this.ticketsRepo.findById(this.databaseService.db, id);

    if (!ticket || !canAccessTicket(user, ticket)) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === status) {
      throw new ConflictException(`Ticket already ${status}`);
    }

    await this.databaseService.db.transaction(async (tx) => {
      await this.ticketsRepo.updateTicket(tx, id, { status });

      await this.statusHistoryRepo.add(tx, {
        ticketId: id,
        oldStatus: ticket.status,
        newStatus: status,
        changedBy: user.id,
      });

      await this.auditRepo.log(tx, {
        entityType: 'ticket',
        entityId: id,
        action: `ticket.${status}`,
        performedBy: user.id,
      });
    });
  }

  async closeTicket(input: { ticketId: string; userId: string }) {
    const ticket = await this.ticketsRepo.findById(
      this.databaseService.db,
      input.ticketId,
    );

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new ConflictException('Ticket already closed');
    }

    await this.databaseService.db.transaction(async (tx) => {
      await this.ticketsRepo.updateTicket(tx, input.ticketId, {
        status: 'closed',
      });

      await this.statusHistoryRepo.add(tx, {
        ticketId: input.ticketId,
        oldStatus: ticket.status,
        newStatus: 'closed',
        changedBy: input.userId,
      });

      await this.auditRepo.log(tx, {
        entityType: 'ticket',
        entityId: input.ticketId,
        action: 'ticket.close',
        performedBy: input.userId,
      });
    });
  }
}
