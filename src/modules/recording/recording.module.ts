import { Module } from '@nestjs/common';
import { RecordingGateway } from './recording.gateway';
import { RecordingService } from './recording.service';
import { RecordingController } from './recording.controller';
import { RedisModule } from 'src/intergrations/redis/redis.module';
import { FfmpegModule } from '../../intergrations/ffmpeg/ffmpeg.module';
import { NotificationModule } from '../../core/notifications/notification.module';
import { WebSocketNotificationModule } from '../../intergrations/websocket/websocket-notification.module';
import { EmailNotificationModule } from '../../intergrations/email/email-notification.module';
import { LocalStorageService } from '../../intergrations/storage/local-storage.service';
import { getStorageConfig } from '../../config/storage.config';
import { STORAGE_SERVICE } from '../../intergrations/storage/storage.token';

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
