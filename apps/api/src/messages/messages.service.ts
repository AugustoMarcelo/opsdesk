import { auditLog } from './../db/schema/audit-log';
import { messages } from './../db/schema/messages';
import { db } from './../db/client';
import { CreateMessageDto } from './dto/create-message.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagesService {
  async createMessage(input: CreateMessageDto) {
    return db.transaction(async (tx) => {
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
  }
}
