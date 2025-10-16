import { Module } from '@nestjs/common';
import { WebSocketNotificationService } from './websocket-notification.service';

@Module({
  providers: [WebSocketNotificationService],
  exports: [WebSocketNotificationService],
})
export class WebSocketNotificationModule {}
