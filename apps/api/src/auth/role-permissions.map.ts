export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'ticket:create',
    'ticket:read',
    'ticket:update',
    'ticket:close',
    'user:create',
    'user:read',
    'message:send',
  ],
  agent: ['ticket:read', 'ticket:update'],
  customer: ['ticket:create', 'ticket:read', 'message:send'],
};
