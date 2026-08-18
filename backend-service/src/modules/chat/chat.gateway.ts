import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import type { JwtPayload } from '../../common/auth.guard';
import { ChatService } from './chat.service';

@Controller('api/journeys')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(':journeyId/messages')
  @UseGuards(JwtAuthGuard)
  history(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string) {
    return this.chat.history(user.sub, journeyId);
  }

  @Post(':journeyId/messages')
  @UseGuards(JwtAuthGuard)
  send(@CurrentUser() user: JwtPayload, @Param('journeyId') journeyId: string, @Body() body: { content: string }) {
    return this.chat.send(user.sub, journeyId, body.content ?? '');
  }
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private readonly chat: ChatService, private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.headers.authorization?.toString().replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('missing token');
      client.data.user = await this.jwt.verifyAsync(token);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('journey:join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { journeyId: string }) {
    await this.chat.assertMember(client.data.user.sub, body.journeyId);
    await client.join(`journey:${body.journeyId}`);
    return { event: 'journey:joined', data: { journeyId: body.journeyId } };
  }

  @SubscribeMessage('message:send')
  async send(@ConnectedSocket() client: Socket, @MessageBody() body: { journeyId: string; content: string }) {
    const result = await this.chat.send(client.data.user.sub, body.journeyId, body.content ?? '');
    if (result.blocked) {
      client.emit('chat:error', { code: 'ANTI_CONTACT_BLOCKED', message: result.reason });
      return { event: 'chat:error', data: { code: 'ANTI_CONTACT_BLOCKED', message: result.reason } };
    }
    this.server.to(`journey:${body.journeyId}`).emit('message:receive', result.message);
    return { event: 'message:sent', data: result.message };
  }
}
