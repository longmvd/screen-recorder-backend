import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getStorageConfig } from '../../config/storage.config';
import { NotificationService } from '../../core/notifications/notification.service';
import {
  NotificationChannel,
  NotificationPriority,
} from '../../core/notifications/notification.types';
import { FfmpegService } from '../../integrations/ffmpeg/ffmpeg.service';
import { type IStorageService } from '../../integrations/storage/storage.interface';
import { STORAGE_SERVICE } from '../../integrations/storage/storage.token';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private readonly config = getStorageConfig();

  constructor(
    private readonly ffmpegService: FfmpegService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly notificationService: NotificationService,
  ) {}

  async startRecording(recordId: string) {
    const dir = path.join(this.config.tempDir, recordId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.logger.log(`Started recording: ${recordId}`);
  }

  async saveChunk(recordId: string, chunk: Buffer, index: number) {
    const dir = path.join(this.config.tempDir, recordId);
    const filename = path.join(
      dir,
      `chunk-${index.toString().padStart(3, '0')}.webm`,
    );
    await fs.promises.writeFile(filename, chunk);
  }

  async finishRecording(recordId: string) {
    this.logger.log(`Finishing recording: ${recordId}`);

    try {
      // 1. Merge chunks with FFmpeg
      const outputPath = path.join(
        this.config.tempDir,
        recordId,
        'merged.webm',
      );
      await this.ffmpegService.mergeChunks(
        recordId,
        this.config.tempDir,
        outputPath,
      );

      // 2. Get video metadata
      const metadata = await this.ffmpegService.getVideoMetadata(outputPath);

      // 3. Save to storage (LOCAL or MINIO)
      const storageKey = `${recordId}/final.webm`;
      const downloadUrl = await this.storageService.save(
        outputPath,
        storageKey,
      );

      this.logger.log(`Recording saved to storage: ${downloadUrl}`);

      // 4. Cleanup chunks and temp merged file
      if (this.config.cleanupChunks) {
        await this.cleanupChunks(recordId);
      }

      // 5. Notify client via multi-channel (WebSocket + Email if configured)
      await this.notificationService.send({
        recipient: recordId, // TODO: Replace with actual userId or email
        channel: [NotificationChannel.WEBSOCKET], // Add EMAIL to array when user email is available
        priority: NotificationPriority.NORMAL,
        category: 'recording',
        event: 'recordingReady',
        data: {
          recordId,
          downloadUrl,
          size: metadata.size,
          duration: metadata.duration,
        },
      });

      return {
        recordId,
        downloadUrl,
        size: metadata.size,
        duration: metadata.duration,
      };
    } catch (error) {
      this.logger.error(
        `Failed to finish recording ${recordId}: ${error.message}`,
      );
      await this.notificationService.send({
        recipient: recordId, // TODO: Replace with actual userId
        channel: [NotificationChannel.WEBSOCKET],
        priority: NotificationPriority.HIGH,
        category: 'recording',
        event: 'recordingError',
        data: {
          recordId,
          error: error.message,
        },
      });
      throw error;
    }
  }

  private async cleanupChunks(recordId: string): Promise<void> {
    try {
      const chunkDir = path.join(this.config.tempDir, recordId);

      if (fs.existsSync(chunkDir)) {
        // Remove all files in the directory
        const files = await fs.promises.readdir(chunkDir);
        for (const file of files) {
          await fs.promises.unlink(path.join(chunkDir, file));
        }

        // Remove the directory
        await fs.promises.rmdir(chunkDir);

        this.logger.log(`Cleaned up chunks for recording: ${recordId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup chunks for ${recordId}: ${error.message}`,
      );
      // Don't throw - cleanup failure shouldn't fail the entire operation
    }
  }
}
