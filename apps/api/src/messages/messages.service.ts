import { auditLog } from './../db/schema/audit-log';
import { messages } from './../db/schema/messages';
import { tickets } from './../db/schema/tickets';
import { userNotifications } from './../db/schema/user-notifications';
import { db } from './../db/client';
import { CreateMessageDto } from './dto/create-message.dto';
import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { MessageSentEvent } from '../../../../packages/events/message-sent.event';
import { asc, eq } from 'drizzle-orm';

@Injectable()
export class MessagesService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async listByTicketId(ticketId: string) {
    const items = await db
      .select()
      .from(messages)
      .where(eq(messages.ticketId, ticketId))
      .orderBy(asc(messages.createdAt));

    return {
      data: items,
      meta: { count: items.length },
    };
  }

  async createMessage(input: CreateMessageDto) {
    const message = await db.transaction(async (tx) => {
      const [message] = await tx
        .insert(messages)
        .values({
          ticketId: input.ticketId,
          authorId: input.authorId,
          content: input.content,
        })
        .returning();

      // AUDIT LOG
      await tx.insert(auditLog).values({
        entityType: 'message',
        entityId: message.id,
        action: 'message.created',
        performedBy: input.authorId,
        metadata: {
          ticketId: input.ticketId,
        },
      });

      return message;
    });

    // Publish message.sent event after transaction commits
    const messageSentEvent: MessageSentEvent = {
      event: 'message.sent',
      payload: {
        id: message.id,
        ticketId: message.ticketId,
        authorId: message.authorId,
        content: message.content,
        sentAt: message.createdAt.toISOString(),
      },
    };

    this.rabbit.publish<MessageSentEvent>('message.sent', messageSentEvent);

    // Create notification for ticket owner if they didn't send the message
    const [ticket] = await db
      .select({ ownerId: tickets.ownerId })
      .from(tickets)
      .where(eq(tickets.id, input.ticketId));
    if (ticket && ticket.ownerId !== input.authorId) {
      await db.insert(userNotifications).values({
        userId: ticket.ownerId,
        ticketId: input.ticketId,
        type: 'message',
      });
    }

    return message;
  }
}
