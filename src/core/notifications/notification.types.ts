export enum NotificationChannel {
  WEBSOCKET = 'websocket',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationPayload {
  recipient: string | string[]; // userId, email, phone, socketId
  channel: NotificationChannel | NotificationChannel[];
  priority: NotificationPriority;
  category: string; // 'recording', 'user', 'payment', etc.
  event: string; // 'recordingReady', 'userRegistered', etc.
  data: any;
  metadata?: {
    retryCount?: number;
    scheduledAt?: Date;
    expiresAt?: Date;
    templateId?: string;
  };
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  recipient: string;
  error?: string;
  sentAt: Date;
}

export interface BroadcastPayload {
  channel: NotificationChannel | NotificationChannel[];
  priority: NotificationPriority;
  category: string;
  event: string;
  data: any;
  metadata?: {
    templateId?: string;
  };
}
