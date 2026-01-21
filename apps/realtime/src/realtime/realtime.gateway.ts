import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeAuthService } from './realtime-auth.service';
import { TicketsRepository } from './tickets.repository';
import { Roles } from '../../../../packages/shared/roles';
import { ForbiddenException } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealtimeGateway {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly auth: RealtimeAuthService,
    private readonly ticketsRepo: TicketsRepository,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        socket.data.user = await this.auth.authenticateSocket(socket);
        next();
      } catch (err) {
        next(err as Error);
      }
    });
  }

  @SubscribeMessage('ticket.join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    const user = client.data.user as
      | { id: string; roles: string[] }
      | undefined;

    if (!user?.id) {
      throw new ForbiddenException('Unauthenticated socket');
    }

    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) return;

    const canAccess =
      user.roles.includes(Roles.Admin) ||
      user.roles.includes(Roles.Agent) ||
      ticket.ownerId === user.id;

    if (!canAccess) {
      throw new ForbiddenException('Not allowed to join this ticket');
    }

    await client.join(`ticket:${ticketId}`);
  }

  emitToTicketRoom(event: string, ticketId: string, payload: unknown) {
    this.server.to(`ticket:${ticketId}`).emit(event, payload);
  }
}

