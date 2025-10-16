import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { RecordingService } from './recording.service';
import { RedisService } from '../../intergrations/redis/redis.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { WebSocketNotificationService } from '../../intergrations/websocket/websocket-notification.service';

import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway(8000, {
  transports: ['websocket'],
  namespace: '/recording',
  cors: {
    origin: '*',
  },
})
export class RecordingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  server: any;

  constructor(
    private readonly recordingService: RecordingService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
    private readonly websocketNotificationService: WebSocketNotificationService,
  ) {}

  handleDisconnect(client: any) {
    console.log('Disconnected');
  }

  afterInit(server: any) {
    this.server = server;

    // Initialize WebSocket notification channel
    this.websocketNotificationService.setServer(server);

    // Register WebSocket channel with core notification service
    this.notificationService.registerChannel(this.websocketNotificationService);

    console.log('Initialized - WebSocket notification channel registered');
  }

  handleConnection(client: any, ...args: any[]) {
    console.log('Connected');
  }

  @SubscribeMessage('start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordId: string },
  ) {
    await this.recordingService.startRecording(data.recordId);
    client.emit('started', { recordId: data.recordId });
  }

  @SubscribeMessage('chunk')
  async handleChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordId: string; chunk: Buffer },
  ) {
    console.log(data);
    const index = await this.redisService.getNextChunkIndex(data.recordId);
    await this.recordingService.saveChunk(data.recordId, data.chunk, index);
    client.emit('chunkSaved', { recordId: data.recordId, index });
  }

  @SubscribeMessage('stop')
  async handleStop(
    @MessageBody() data: { recordId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.recordingService.finishRecording(data.recordId);
    await this.redisService.deleteRecordingData(data.recordId);
    client.emit('finished', { recordId: data.recordId });
  }
}
