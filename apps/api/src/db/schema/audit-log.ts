import { pgTable, uuid, jsonb, text, timestamp } from 'drizzle-orm/pg-core';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(), // ticket
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(), // created, status_changed
  performedBy: uuid('performed_by'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
