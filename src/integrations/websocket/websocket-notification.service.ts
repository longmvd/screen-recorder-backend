import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { INotificationChannel } from '../../core/notifications/notification-channel.interface';
import {
  NotificationChannel,
  NotificationPayload,
  BroadcastPayload,
} from '../../core/notifications/notification.types';

@Injectable()
export class WebSocketNotificationService implements INotificationChannel {
  private readonly logger = new Logger(WebSocketNotificationService.name);
  private server: Server;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server initialized');
  }

  getChannelName(): NotificationChannel {
    return NotificationChannel.WEBSOCKET;
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.WEBSOCKET;
  }

  async isHealthy(): Promise<boolean> {
    return this.server !== undefined && this.server !== null;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.server) {
      throw new Error('WebSocket server not initialized');
    }

    const recipients = Array.isArray(payload.recipient)
      ? payload.recipient
      : [payload.recipient];

    for (const recipient of recipients) {
      // Emit to specific socket/room
      this.server.to(recipient).emit(payload.event, {
        ...payload.data,
        category: payload.category,
        priority: payload.priority,
        timestamp: new Date(),
      });

      this.logger.log(
        `WebSocket notification sent: ${payload.event} to ${recipient}`,
      );
    }
  }

  async broadcast(payload: BroadcastPayload): Promise<void> {
    if (!this.server) {
      throw new Error('WebSocket server not initialized');
    }

    // Broadcast to all connected clients
    this.server.emit(payload.event, {
      ...payload.data,
      category: payload.category,
      priority: payload.priority,
      timestamp: new Date(),
    });

    this.logger.log(`WebSocket broadcast sent: ${payload.event}`);
  }

  /**
   * Legacy methods for backward compatibility
   * These map to the new channel pattern
   */

  notifyRecordingReady(data: {
    recordId: string;
    downloadUrl: string;
    size: number;
    duration: number;
  }): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    this.server.emit('recordingReady', {
      ...data,
      timestamp: new Date(),
    });
  }

  notifyRecordingError(recordId: string, error: string): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    this.server.emit('recordingError', {
      recordId,
      error,
      timestamp: new Date(),
    });
  }

  notifyMergeProgress(recordId: string, progress: number): void {
    if (!this.server) {
      return;
    }

    this.server.emit('mergeProgress', {
      recordId,
      progress,
      timestamp: new Date(),
    });
  }
}
