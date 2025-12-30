import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { tickets } from './tickets';
import { users } from './users';

export const ticketStatusHistory = pgTable('ticket_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  oldStatus: text('old_status'),
  newStatus: text('new_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
  createdBy: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
