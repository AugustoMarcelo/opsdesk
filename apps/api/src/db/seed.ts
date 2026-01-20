import { userRoles } from './schema/user-roles';
import { users } from './schema/users';
import { rolePermissions } from './schema/role-permissions';
import { permissions } from './schema/permissions';
import { db } from './client';
import { roles } from './schema/roles';
import { hash } from 'bcrypt';

async function main() {
  console.log('🌱 Running database seed...');

  // Roles
  const [adminRole] = await db
    .insert(roles)
    .values({ name: 'admin' })
    .onConflictDoNothing()
    .returning();

  const [agentRole] = await db
    .insert(roles)
    .values({ name: 'agent' })
    .onConflictDoNothing()
    .returning();

  const [customerRole] = await db
    .insert(roles)
    .values({ name: 'customer' })
    .onConflictDoNothing()
    .returning();

  // Permissions
  const permissionNames = [
    'ticket:create',
    'ticket:read',
    'ticket:update',
    'ticket:assign',
    'ticket:close',
    'message:send',
  ];

  const insertedPermissions = await db
    .insert(permissions)
    .values(permissionNames.map((name) => ({ name })))
    .onConflictDoNothing()
    .returning();

  // Role <-> Permissions
  // Admin Permissions
  for (const permission of insertedPermissions) {
    await db
      .insert(rolePermissions)
      .values([{ roleId: adminRole.id, permissionId: permission.id }])
      .onConflictDoNothing();
  }

  // Agent Permissions
  const agentPermissions = insertedPermissions.filter((p) =>
    ['ticket:read', 'ticket:update', 'message:send'].includes(p.name),
  );

  for (const permission of agentPermissions) {
    await db
      .insert(rolePermissions)
      .values([{ roleId: agentRole.id, permissionId: permission.id }])
      .onConflictDoNothing();
  }

  // Customer Permissions
  const customerPermissions = insertedPermissions.filter((p) =>
    ['ticket:create', 'ticket:read', 'message:send'].includes(p.name),
  );

  for (const permission of customerPermissions) {
    await db
      .insert(rolePermissions)
      .values([{ roleId: customerRole.id, permissionId: permission.id }]);
  }

  // Users
  const passwordHash = await hash('123456', 10);

  const [adminUser] = await db
    .insert(users)
    .values({ name: 'admin', email: 'admin@opsdesk.dev', passwordHash })
    .onConflictDoNothing()
    .returning();

  await db
    .insert(userRoles)
    .values({ userId: adminUser.id, roleId: adminRole.id });

  console.log('✅ Seed completed');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed failed');
    console.error(error);
    process.exit(1);
  });
