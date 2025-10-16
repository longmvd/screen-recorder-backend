import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface RecordingReadyPayload {
  recordId: string;
  downloadUrl: string;
  size: number;
  duration: number;
  timestamp: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private server: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Notify client that recording is ready for download
   */
  notifyRecordingReady(payload: RecordingReadyPayload): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    this.logger.log(`Notifying recording ready: ${payload.recordId}`);

    this.server.emit('recordingReady', payload);
  }

  /**
   * Notify client about recording error
   */
  notifyRecordingError(recordId: string, error: string): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    this.logger.error(`Recording error for ${recordId}: ${error}`);

    this.server.emit('recordingError', {
      recordId,
      error,
      timestamp: new Date(),
    });
  }

  /**
   * Notify client about merge progress
   */
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
