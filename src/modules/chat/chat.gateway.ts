import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/api/v1/realtime',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  handleMessage(client: Socket, payload: { receiverId: string; message: string }) {
    this.logger.log(`Stub: Message from ${client.id} to ${payload.receiverId}`);
    this.server.to(payload.receiverId).emit('message:received', {
      senderId: client.data.userId,
      message: payload.message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join:room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }
}
