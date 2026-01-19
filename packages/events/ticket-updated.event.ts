export interface TicketUpdatedEvent {
  event: 'ticket.updated';
  payload: {
    id: string;
    title?: string;
    description?: string;
    updatedBy: string;
    updatedAt: string;
  };
}
