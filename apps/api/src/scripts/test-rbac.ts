import 'dotenv/config';
import { TicketsService } from '../tickets/tickets.service';

const service = new TicketsService();

async function test(userId: string, label: string) {
  try {
    await service.createTicket({
      title: 'RBAC test',
      description: 'Should fail or suceed',
      ownerId: '00000000-0000-0000-0000-000000000000',
      userId,
    });

    console.log(`✅ ${label}: allowed`);
  } catch {
    console.log(`❌ ${label}: forbidden`);
  }
}

async function run() {
  await test('00000000-0000-0000-0000-000000000000', 'User with role');

  await test('ffffffff-ffff-ffff-ffff-ffffffffffff', 'User without role');
}

void run();
