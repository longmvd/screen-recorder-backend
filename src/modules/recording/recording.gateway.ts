import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { NotificationService } from '../../core/notifications/notification.service';
import { RedisService } from '../../integrations/redis/redis.service';
import { WebSocketNotificationService } from '../../integrations/websocket/websocket-notification.service';
import { RecordingService } from './recording.service';

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
  private activeRecordings = new Map<
    string,
    {
      recordId: string;
      startedAt: number;
      lastChunkAt: number;
    }
  >();

  constructor(
    private readonly recordingService: RecordingService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
    private readonly websocketNotificationService: WebSocketNotificationService,
  ) {}

  handleDisconnect(client: Socket) {
    const recording = this.activeRecordings.get(client.id);

    if (recording) {
      console.log(
        `Client disconnected with active recording: ${recording.recordId}`,
      );

      // Auto-finalize after grace period
      setTimeout(() => {
        void this.autoFinalizeRecording(client.id, recording.recordId);
      }, 5000); // 5 second grace period for reconnection
    }

    console.log('Client disconnected');
  }

  private async autoFinalizeRecording(
    clientId: string,
    recordId: string,
  ): Promise<void> {
    // Check local tracking first (optimization for single instance)
    if (!this.activeRecordings.has(clientId)) {
      console.log(
        `Skipping auto-finalize for ${recordId} - already stopped locally`,
      );
      return;
    }

    // Try to acquire distributed lock (HA-safe)
    const lockAcquired =
      await this.redisService.acquireFinalizationLock(recordId);

    if (!lockAcquired) {
      console.log(
        `Recording ${recordId} already being finalized by another process`,
      );
      this.activeRecordings.delete(clientId);
      return;
    }

    try {
      console.log(`Auto-finalizing recording after disconnect: ${recordId}`);
      await this.recordingService.finishRecording(recordId);
      await this.redisService.deleteRecordingData(recordId);
      console.log(`Auto-finalized recording: ${recordId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Auto-finalize failed for ${recordId}:`, errorMessage);
      // Cleanup anyway even if merge fails
      try {
        await this.recordingService.cleanupChunks(recordId);
        await this.redisService.deleteRecordingData(recordId);
      } catch (cleanupError) {
        const cleanupErrorMessage =
          cleanupError instanceof Error
            ? cleanupError.message
            : 'Unknown error';
        console.error(
          `Cleanup also failed for ${recordId}:`,
          cleanupErrorMessage,
        );
      }
    } finally {
      this.activeRecordings.delete(clientId);
      // Always release lock, even if error occurred
      await this.redisService.releaseFinalizationLock(recordId);
    }
  }

  afterInit(server: any) {
    this.server = server;

    // Initialize WebSocket notification channel
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.websocketNotificationService.setServer(server);

    // Register WebSocket channel with core notification service
    this.notificationService.registerChannel(this.websocketNotificationService);

    console.log('Initialized - WebSocket notification channel registered');
  }

  handleConnection() {
    console.log('Connected');
  }

  @SubscribeMessage('start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordId: string },
  ) {
    // Track this recording for this client
    this.activeRecordings.set(client.id, {
      recordId: data.recordId,
      startedAt: Date.now(),
      lastChunkAt: Date.now(),
    });

    // Store in Redis for HA compatibility
    await this.redisService.set(
      `recording:${data.recordId}:started_at`,
      Date.now().toString(),
      7200, // 2 hours TTL
    );

    await this.recordingService.startRecording(data.recordId);
    client.emit('started', { recordId: data.recordId });
  }

  @SubscribeMessage('chunk')
  async handleChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordId: string; chunk: Buffer; checksum?: string },
  ) {
    try {
      // Update last activity timestamp
      const recording = this.activeRecordings.get(client.id);
      if (recording) {
        recording.lastChunkAt = Date.now();
      }

      // Get next index from Redis (HA-safe, atomic operation)
      const index = await this.redisService.getNextChunkIndex(data.recordId);

      // Save chunk to filesystem
      await this.recordingService.saveChunk(data.recordId, data.chunk, index);

      // Send success acknowledgment
      client.emit('chunkAck', {
        recordId: data.recordId,
        index: index,
        status: 'success',
        timestamp: Date.now(),
      });

      console.log(
        `[Recording ${data.recordId}] Chunk ${index} saved successfully (${data.chunk.length} bytes)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Recording ${data.recordId}] Failed to save chunk:`,
        errorMessage,
      );

      // Send error notification to client
      client.emit('chunkError', {
        recordId: data.recordId,
        error: errorMessage,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('stop')
  async handleStop(
    @MessageBody() data: { recordId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Try to acquire distributed lock to prevent duplicate finalization
    const lockAcquired = await this.redisService.acquireFinalizationLock(
      data.recordId,
    );

    if (!lockAcquired) {
      console.log(
        `Recording ${data.recordId} already being finalized by another process`,
      );
      client.emit('finished', {
        recordId: data.recordId,
        note: 'Already processed',
      });
      return;
    }

    // Remove from local tracking
    this.activeRecordings.delete(client.id);

    try {
      await this.recordingService.finishRecording(data.recordId);
      await this.redisService.deleteRecordingData(data.recordId);
      client.emit('finished', { recordId: data.recordId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `Failed to finish recording ${data.recordId}:`,
        errorMessage,
      );
      throw error;
    } finally {
      // Always release lock, even if error occurred
      await this.redisService.releaseFinalizationLock(data.recordId);
    }
  }
}
