export const Roles = {
  Admin: 'admin',
  Agent: 'agent',
  Customer: 'customer',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];