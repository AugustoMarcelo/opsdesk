import {
  tickets,
  ticketHistory,
  ticketStatusHistory,
  auditLog,
  messages,
  rolePermissions,
  userRoles,
  permissions,
  roles,
  users,
} from './../../src/db/schema';
import type { DBExecutor } from '../../src/db/db-executor.type';

/**
 * Cleanup database after each test
 * Only deletes test data (tickets, messages, etc.), preserving setup data
 * Setup data (users, roles, permissions) created in beforeAll is preserved
 */
export async function cleanupDatabase(db: DBExecutor) {
  // Delete in order to respect foreign key constraints
  // Only delete test-specific data, not setup data
  await db.delete(messages);
  await db.delete(ticketStatusHistory);
  await db.delete(ticketHistory);
  await db.delete(auditLog);
  await db.delete(tickets);
  await db.delete(rolePermissions);
  await db.delete(userRoles);
  await db.delete(permissions);
  await db.delete(roles);
  await db.delete(users);
  // Keep users, roles, permissions, userRoles, rolePermissions - they're setup data
}
