import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TicketCreatedEvent } from '../../../../packages/events/ticket-created.event';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class TicketsGateway {
  @WebSocketServer()
  private server!: Server;

  afterInit() {
    console.log('TicketsGateway initialized');
  }

  ticketCreated({ event, payload }: TicketCreatedEvent) {
    this.server.to(`ticket:${payload.id}`).emit(event, payload);
  }

  @SubscribeMessage('ticket.join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    await client.join(`ticket:${ticketId}`);
  }
}
