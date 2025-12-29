import 'dotenv/config';
import { TicketsService } from '../tickets/tickets.service';

const service = new TicketsService();

async function run() {
  const ticket = await service.createTicket({
    title: 'Drizzle transaction test',
    description: 'ACID is working',
    ownerId: '00000000-0000-0000-0000-000000000000',
    userId: '00000000-0000-0000-0000-000000000000',
  });

  console.log(ticket);
}

run().catch(console.error);
