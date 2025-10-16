/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { RecordingService } from './recording.service';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
  constructor(private readonly recordingService: RecordingService) {}
  handleDisconnect(client: any) {
    console.log('Disconnected');
  }
  afterInit(server: any) {
    console.log('Initialized');
  }
  handleConnection(client: any, ...args: any[]) {
    console.log('Connected');
  }

  private sessionChunkIndex: Record<string, number> = {};

  @SubscribeMessage('start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordId: string },
  ) {
    this.sessionChunkIndex[data.recordId] = 0;
    await this.recordingService.startRecording(data.recordId);
    client.emit('started', { recordId: data.recordId });
  }

  @SubscribeMessage('chunk')
  async handleChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordId: string; chunk: Buffer },
  ) {
    console.log(data);
    const index = this.sessionChunkIndex[data.recordId] ?? 0;
    await this.recordingService.saveChunk(data.recordId, data.chunk, index);
    this.sessionChunkIndex[data.recordId] = index + 1;
    client.emit('chunkSaved', { recordId: data.recordId, index });
  }

  @SubscribeMessage('stop')
  async handleStop(
    @MessageBody() data: { recordId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.recordingService.finishRecording(data.recordId);
    delete this.sessionChunkIndex[data.recordId];
    client.emit('finished', { recordId: data.recordId });
  }
}
