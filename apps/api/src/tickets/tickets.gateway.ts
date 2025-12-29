/* eslint-disable
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access
*/

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class TicketsGateway {
  @WebSocketServer()
  server!: Server;

  afterInit() {
    console.log('TicketsGateway initialized');
  }

  ticketCreated(payload: any) {
    this.server.emit('ticket.created', payload);
  }
}
