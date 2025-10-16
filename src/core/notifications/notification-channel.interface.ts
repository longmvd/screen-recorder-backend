import {
  NotificationChannel,
  NotificationPayload,
  BroadcastPayload,
} from './notification.types';

export interface INotificationChannel {
  /**
   * Send notification to specific recipient(s)
   */
  send(payload: NotificationPayload): Promise<void>;

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(payload: BroadcastPayload): Promise<void>;

  /**
   * Check if this channel supports the given channel type
   */
  supports(channel: NotificationChannel): boolean;

  /**
   * Check if the channel is healthy and ready to send
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get the channel name
   */
  getChannelName(): NotificationChannel;
}
