export interface TicketCreatedEvent {
  ticketId: string;
  ownerId: string;
  createdAt: Date;
}
