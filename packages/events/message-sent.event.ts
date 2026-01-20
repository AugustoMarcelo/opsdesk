export interface MessageSentEvent {
  event: 'message.sent';
  payload: {
    id: string;
    ticketId: string;
    authorId: string;
    content: string;
    sentAt: string;
  };
}
