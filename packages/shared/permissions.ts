export const Permissions = {
  TicketCreate: 'ticket:create',
  TicketRead: 'ticket:read',
  TicketReadOwn: 'ticket:read:own',
  TicketUpdate: 'ticket:update',
  TicketClose: 'ticket:close',

  UserCreate: 'user:create',
  UserRead: 'user:read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];