import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { INotificationChannel } from './notification-channel.interface';
import {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
  BroadcastPayload,
} from './notification.types';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private channels: Map<NotificationChannel, INotificationChannel> = new Map();

  async onModuleInit() {
    this.logger.log('Notification service initialized');
  }

  /**
   * Register a notification channel
   */
  registerChannel(channel: INotificationChannel): void {
    const channelName = channel.getChannelName();
    this.channels.set(channelName, channel);
    this.logger.log(`Registered notification channel: ${channelName}`);
  }

  /**
   * Send notification through specified channel(s)
   */
  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    const channels = Array.isArray(payload.channel)
      ? payload.channel
      : [payload.channel];

    const results: NotificationResult[] = [];

    for (const channelType of channels) {
      const channel = this.channels.get(channelType);

      if (!channel) {
        this.logger.warn(`Channel not registered: ${channelType}`);
        results.push({
          channel: channelType,
          success: false,
          recipient: Array.isArray(payload.recipient)
            ? payload.recipient.join(', ')
            : payload.recipient,
          error: 'Channel not registered',
          sentAt: new Date(),
        });
        continue;
      }

      try {
        // Check channel health
        const isHealthy = await channel.isHealthy();
        if (!isHealthy) {
          throw new Error('Channel is not healthy');
        }

        // Send notification
        await channel.send(payload);

        results.push({
          channel: channelType,
          success: true,
          recipient: Array.isArray(payload.recipient)
            ? payload.recipient.join(', ')
            : payload.recipient,
          sentAt: new Date(),
        });

        this.logger.log(
          `Notification sent via ${channelType}: ${payload.event} to ${payload.recipient}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send notification via ${channelType}: ${error.message}`,
        );

        results.push({
          channel: channelType,
          success: false,
          recipient: Array.isArray(payload.recipient)
            ? payload.recipient.join(', ')
            : payload.recipient,
          error: error.message,
          sentAt: new Date(),
        });

        // Optionally retry based on payload.metadata.retryCount
        if (payload.metadata?.retryCount && payload.metadata.retryCount > 0) {
          this.logger.log(`Retry not implemented yet for ${channelType}`);
          // TODO: Implement retry logic
        }
      }
    }

    return results;
  }

  /**
   * Broadcast notification to all connected clients on specified channel(s)
   */
  async broadcast(payload: BroadcastPayload): Promise<NotificationResult[]> {
    const channels = Array.isArray(payload.channel)
      ? payload.channel
      : [payload.channel];

    const results: NotificationResult[] = [];

    for (const channelType of channels) {
      const channel = this.channels.get(channelType);

      if (!channel) {
        this.logger.warn(`Channel not registered: ${channelType}`);
        results.push({
          channel: channelType,
          success: false,
          recipient: 'broadcast',
          error: 'Channel not registered',
          sentAt: new Date(),
        });
        continue;
      }

      try {
        await channel.broadcast(payload);

        results.push({
          channel: channelType,
          success: true,
          recipient: 'broadcast',
          sentAt: new Date(),
        });

        this.logger.log(
          `Broadcast notification sent via ${channelType}: ${payload.event}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to broadcast via ${channelType}: ${error.message}`,
        );

        results.push({
          channel: channelType,
          success: false,
          recipient: 'broadcast',
          error: error.message,
          sentAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Get all registered channels
   */
  getRegisteredChannels(): NotificationChannel[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a channel is registered
   */
  isChannelRegistered(channel: NotificationChannel): boolean {
    return this.channels.has(channel);
  }

  /**
   * Get channel health status
   */
  async getChannelHealth(
    channel: NotificationChannel,
  ): Promise<{ channel: NotificationChannel; healthy: boolean }> {
    const channelInstance = this.channels.get(channel);

    if (!channelInstance) {
      return { channel, healthy: false };
    }

    try {
      const healthy = await channelInstance.isHealthy();
      return { channel, healthy };
    } catch (error) {
      return { channel, healthy: false };
    }
  }
}
