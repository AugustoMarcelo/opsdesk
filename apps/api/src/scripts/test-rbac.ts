import 'dotenv/config';
import { TicketsService } from '../tickets/tickets.service';
import { TicketsGateway } from '../tickets/tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { TicketHistoryRepository } from 'src/tickets/tickets-history.repository';
import { TicketStatusHistoryRepository } from 'src/tickets/tickets-status-history.repository';
import { TicketsRepository } from 'src/tickets/tickets.repository';
import { AuditRepository } from 'src/audit/audit.repository';
import { DatabaseService } from 'src/db/database.service';

const service = new TicketsService(
  new DatabaseService(),
  new TicketsRepository(),
  new TicketHistoryRepository(),
  new TicketStatusHistoryRepository(),
  new AuditRepository(),
  new TicketsGateway(),
  new AuthorizationService(),
  new RabbitMQService(),
);

async function test(
  user: { id: string; roles: string[]; permissions: string[] },
  label: string,
) {
  try {
    await service.createTicket({
      title: 'RBAC test',
      description: 'Should fail or suceed',
      user,
    });

    console.log(`✅ ${label}: allowed`);
  } catch {
    console.log(`❌ ${label}: forbidden`);
  }
}

async function run() {
  await test(
    {
      id: '00000000-0000-0000-0000-000000000000',
      roles: ['admin'],
      permissions: [],
    },
    'User with admin role',
  );

  await test(
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      roles: [],
      permissions: ['ticket.create'],
    },
    'User with ticket.create permission',
  );
}

void run();
