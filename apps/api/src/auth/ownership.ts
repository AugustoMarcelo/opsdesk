import { Roles } from './../../../../packages/shared/roles';

export function canAccessTicket(
  user: { id: string; roles: string[] },
  ticket: { ownerId: string },
): boolean {
  if (user.roles.includes(Roles.Admin)) return true;
  if (user.roles.includes(Roles.Agent)) return true;

  return ticket.ownerId === user.id;
}
