import { users } from './users';
import { tickets } from './tickets';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const userNotifications = pgTable('user_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id),
  type: text('type').notNull(), // 'message' | 'status_change'
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
