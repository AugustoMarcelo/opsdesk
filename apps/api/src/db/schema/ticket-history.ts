import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { tickets } from './tickets';

export const ticketHistory = pgTable('ticket_history', {
  id: uuid('id').defaultRandom().primaryKey(),

  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id),

  action: text('action').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
