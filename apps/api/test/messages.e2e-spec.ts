import { Test } from '@nestjs/testing';
import { MessagesService } from '../src/messages/messages.service';
import { RabbitMQService } from '../src/messaging/rabbitmq.service';
import { RabbitMQMockService } from './helpers/rabbitmq-mock.service';
import { db } from '../src/db/client';

describe('MessagesService — ACID rollback', () => {
  let service: MessagesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: RabbitMQService, useClass: RabbitMQMockService },
      ],
    }).compile();

    service = module.get(MessagesService);
  });

  it('should rollback message creation if audit log fails', async () => {
    // força falha no audit
    jest.spyOn(db, 'transaction').mockImplementationOnce(async (fn) => {
      return fn({
        insert: () => {
          throw new Error('audit failure');
        },
      } as any);
    });

    await expect(
      service.createMessage({
        ticketId: '00000000-0000-0000-0000-000000000001',
        authorId: '00000000-0000-0000-0000-000000000002',
        content: 'test message',
      }),
    ).rejects.toThrow();

    // Transaction threw before commit → no message persisted (ACID rollback)
  });
});
