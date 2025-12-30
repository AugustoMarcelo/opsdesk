export interface TicketCreatedEvent {
  event: 'ticket.created';
  payload: {
    id: string;
    title: string;
    description: string;
    ownerId: string;
    createdAt: string;
  };
}