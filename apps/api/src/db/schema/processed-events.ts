import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Table to track processed events for idempotency
 * Prevents duplicate processing of messages from RabbitMQ
 */
export const processedEvents = pgTable('processed_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull().unique(), // Message ID from RabbitMQ
  eventType: text('event_type').notNull(), // e.g., 'ticket.created', 'message.sent'
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  processorName: text('processor_name').notNull(), // e.g., 'worker', 'notification-service'
});
