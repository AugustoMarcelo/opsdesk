import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { roles } from './roles';
import { users } from './users';

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id)
    .notNull(),
});
