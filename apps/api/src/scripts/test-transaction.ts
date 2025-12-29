import 'dotenv/config';
import { TicketsService } from '../tickets/tickets.service';
import { TicketsGateway } from '../tickets/tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';

const service = new TicketsService(
  new TicketsGateway(),
  new AuthorizationService(),
);

async function run() {
  const ticket = await service.createTicket({
    title: 'Drizzle transaction test',
    description: 'ACID is working',
    userId: '00000000-0000-0000-0000-000000000000',
  });

  console.log(ticket);
}

run().catch(console.error);
