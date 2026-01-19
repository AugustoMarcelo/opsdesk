export interface TicketStatusChangedEvent {
  event: 'ticket.status_changed';
  payload: {
    id: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    changedAt: string;
  };
}
