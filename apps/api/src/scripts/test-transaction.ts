import 'dotenv/config';
import { TicketsService } from '../tickets/tickets.service';
import { AuthorizationService } from '../auth/authorization.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { TicketStatusHistoryRepository } from 'src/tickets/tickets-status-history.repository';
import { AuditRepository } from 'src/audit/audit.repository';
import { DatabaseService } from 'src/db/database.service';
import { TicketsRepository } from 'src/tickets/tickets.repository';
import { TicketHistoryRepository } from 'src/tickets/tickets-history.repository';

const service = new TicketsService(
  new DatabaseService(),
  new TicketsRepository(),
  new TicketHistoryRepository(),
  new TicketStatusHistoryRepository(),
  new AuditRepository(),
  new AuthorizationService(),
  new RabbitMQService(),
);

async function run() {
  const ticket = await service.createTicket({
    title: 'Drizzle transaction test',
    description: 'ACID is working',
    user: {
      id: '00000000-0000-0000-0000-000000000000',
      roles: [],
      permissions: [],
    },
  });

  console.log(ticket);
}

run().catch(console.error);
