export type TicketHistoryEventType = 'created' | 'status_change' | 'message';

export interface TicketHistoryEventDto {
  type: TicketHistoryEventType;
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface TicketHistoryResponseDto {
  data: TicketHistoryEventDto[];
}
