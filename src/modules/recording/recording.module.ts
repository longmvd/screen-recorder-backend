import { RedisModule } from '@/integrations/redis/redis.module';
import { Module } from '@nestjs/common';
import { getStorageConfig } from '../../config/storage.config';
import { NotificationModule } from '../../core/notifications/notification.module';
import { EmailNotificationModule } from '../../integrations/email/email-notification.module';
import { FfmpegModule } from '../../integrations/ffmpeg/ffmpeg.module';
import { LocalStorageService } from '../../integrations/storage/local-storage.service';
import { STORAGE_SERVICE } from '../../integrations/storage/storage.token';
import { WebSocketNotificationModule } from '../../integrations/websocket/websocket-notification.module';
import { RecordingController } from './recording.controller';
import { RecordingGateway } from './recording.gateway';
import { RecordingService } from './recording.service';

@Module({
  imports: [
    RedisModule,
    FfmpegModule,
    NotificationModule,
    WebSocketNotificationModule,
    EmailNotificationModule,
  ],
  controllers: [RecordingController],
  providers: [
    RecordingGateway,
    RecordingService,
    {
      provide: STORAGE_SERVICE,
      useFactory: () => {
        const config = getStorageConfig();
        // For now, always use LocalStorageService
        // Later can add MinIOStorageService when STORAGE_TYPE=MINIO
        return new LocalStorageService(config);
      },
    },
  ],
})
export class RecordingModule {}
