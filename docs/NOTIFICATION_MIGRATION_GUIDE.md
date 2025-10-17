# Multi-Channel Notification System - Migration Guide

## Overview

This guide explains the migration from the old single-channel WebSocket notification system to the new multi-channel notification architecture that supports WebSocket, Email, SMS, and Push notifications.

## What Changed

### Before (Old System)
```typescript
// Single-purpose notification service in intergrations/notification/
notificationService.notifyRecordingReady({
  recordId,
  downloadUrl,
  size,
  duration,
});
```

### After (New System)
```typescript
// Multi-channel notification service in core/notifications/
await notificationService.send({
  recipient: userId, // or email, phone, socketId
  channel: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
  priority: NotificationPriority.NORMAL,
  category: 'recording',
  event: 'recordingReady',
  data: { recordId, downloadUrl, size, duration },
});
```

## Architecture Changes

### New Structure

```
src/
├── core/
│   └── notifications/               # Core notification system (NEW)
│       ├── notification.types.ts
│       ├── notification-channel.interface.ts
│       ├── notification.service.ts
│       └── notification.module.ts
│
├── intergrations/
│   ├── websocket/                   # WebSocket channel (REFACTORED)
│   │   ├── websocket-notification.service.ts
│   │   └── websocket-notification.module.ts
│   │
│   ├── email/                       # Email channel (NEW)
│   │   ├── email-notification.service.ts
│   │   └── email-notification.module.ts
│   │
│   └── notification/                # OLD - Can be removed after migration
│       ├── notification.service.ts
│       └── notification.module.ts
```

## Migration Steps

### 1. Update Dependencies

Email dependencies are already installed:
```bash
npm install @nestjs-modules/mailer nodemailer handlebars
```

### 2. Update Environment Variables

Add to your `.env` file:
```bash
# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@example.com
```

**Note:** If email credentials are not configured, the email channel will be disabled gracefully.

### 3. Update Module Imports

**Recording Module** (`src/modules/recording/recording.module.ts`):
```typescript
import { NotificationModule } from '../../core/notifications/notification.module';
import { WebSocketNotificationModule } from '../../intergrations/websocket/websocket-notification.module';
import { EmailNotificationModule } from '../../intergrations/email/email-notification.module';

@Module({
  imports: [
    // ... other imports
    NotificationModule,
    WebSocketNotificationModule,
    EmailNotificationModule,
  ],
  // ...
})
```

### 4. Update Gateway to Register Channels

**Recording Gateway** (`src/modules/recording/recording.gateway.ts`):
```typescript
import { NotificationService } from '../../core/notifications/notification.service';
import { WebSocketNotificationService } from '../../intergrations/websocket/websocket-notification.service';

constructor(
  // ... other services
  private readonly notificationService: NotificationService,
  private readonly websocketNotificationService: WebSocketNotificationService,
) {}

afterInit(server: any) {
  this.server = server;
  
  // Initialize WebSocket channel
  this.websocketNotificationService.setServer(server);
  
  // Register channel with core service
  this.notificationService.registerChannel(this.websocketNotificationService);
}
```

### 5. Update Service to Use New API

**Recording Service** (`src/modules/recording/recording.service.ts`):

```typescript
import { NotificationService } from '../../core/notifications/notification.service';
import {
  NotificationChannel,
  NotificationPriority,
} from '../../core/notifications/notification.types';

// Old way:
// this.notificationService.notifyRecordingReady({ ... });

// New way:
await this.notificationService.send({
  recipient: recordId, // TODO: Replace with userId or email
  channel: [NotificationChannel.WEBSOCKET],
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
```

### 6. Optional: Add Email Channel

To send both WebSocket AND Email notifications:

```typescript
await this.notificationService.send({
  recipient: userEmail, // Use actual user email
  channel: [
    NotificationChannel.WEBSOCKET,
    NotificationChannel.EMAIL,
  ],
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
```

### 7. Remove Old Notification Service (Optional)

After verifying the new system works:
1. Delete `src/intergrations/notification/` directory
2. Remove any remaining imports to the old service

## Features

### 1. Multi-Channel Support

Send notifications through multiple channels in a single call:

```typescript
await notificationService.send({
  recipient: 'user@example.com',
  channel: [
    NotificationChannel.WEBSOCKET,
    NotificationChannel.EMAIL,
    // NotificationChannel.SMS,     // Future
    // NotificationChannel.PUSH,    // Future
  ],
  priority: NotificationPriority.HIGH,
  category: 'recording',
  event: 'recordingReady',
  data: { /* ... */ },
});
```

### 2. Priority Levels

```typescript
enum NotificationPriority {
  LOW = 'low',       // Nice to have
  NORMAL = 'normal', // Standard notifications
  HIGH = 'high',     // Important updates
  URGENT = 'urgent', // Critical alerts
}
```

### 3. Broadcast Support

Broadcast to all connected clients:

```typescript
await notificationService.broadcast({
  channel: NotificationChannel.WEBSOCKET,
  priority: NotificationPriority.NORMAL,
  category: 'system',
  event: 'maintenanceAlert',
  data: {
    message: 'System maintenance in 10 minutes',
    scheduledAt: new Date(),
  },
});
```

### 4. Channel Health Monitoring

```typescript
const health = await notificationService.getChannelHealth(
  NotificationChannel.EMAIL
);

console.log(health); // { channel: 'email', healthy: true }
```

### 5. Email Templates

The email channel includes built-in templates for:
- `recordingReady` - Professional email with download link
- `recordingError` - Error notification with details
- Generic fallback for other events

Custom templates can be added via metadata:

```typescript
await notificationService.send({
  recipient: 'user@example.com',
  channel: [NotificationChannel.EMAIL],
  priority: NotificationPriority.NORMAL,
  category: 'user',
  event: 'welcomeEmail',
  data: { username: 'John' },
  metadata: {
    templateId: 'custom-welcome-template',
  },
});
```

## Testing

### 1. Test WebSocket Channel

```bash
# Start the server
npm run start:dev

# Connect via WebSocket client
# Should see: "Initialized - WebSocket notification channel registered"
```

### 2. Test Email Channel

Configure email credentials in `.env`:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourapp.com
```

Trigger a recording completion and check:
1. WebSocket receives `recordingReady` event
2. Email arrives at configured address
3. Check console logs for email delivery confirmation

### 3. Test Without Email Config

Remove email credentials from `.env`:

- Server should start successfully
- WebSocket notifications still work
- Email channel gracefully disabled
- Warning in logs: "Email credentials not configured"

## Error Handling

The system handles failures gracefully:

```typescript
const results = await notificationService.send({
  recipient: 'user@example.com',
  channel: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
  // ...
});

// Check results
results.forEach(result => {
  if (!result.success) {
    console.error(`${result.channel} failed: ${result.error}`);
  }
});
```

Even if one channel fails, others will still be attempted.

## Adding New Channels

### Example: SMS Channel

1. **Create service**:
```typescript
// src/intergrations/sms/sms-notification.service.ts
@Injectable()
export class SmsNotificationService implements INotificationChannel {
  getChannelName(): NotificationChannel {
    return NotificationChannel.SMS;
  }

  async send(payload: NotificationPayload): Promise<void> {
    // Implement with Twilio, AWS SNS, etc.
  }

  // ... implement other methods
}
```

2. **Create module**:
```typescript
// src/intergrations/sms/sms-notification.module.ts
@Module({
  providers: [SmsNotificationService],
  exports: [SmsNotificationService],
})
export class SmsNotificationModule {}
```

3. **Register in gateway**:
```typescript
constructor(
  private readonly smsNotificationService: SmsNotificationService,
) {}

afterInit() {
  this.notificationService.registerChannel(this.smsNotificationService);
}
```

4. **Use it**:
```typescript
await notificationService.send({
  recipient: '+1234567890',
  channel: [NotificationChannel.SMS],
  // ...
});
```

## Best Practices

### 1. Use Appropriate Channels

- **WebSocket**: Real-time updates, progress notifications
- **Email**: Important records, summaries, less urgent updates
- **SMS**: Critical alerts, verification codes (future)
- **Push**: Mobile notifications (future)

### 2. Set Correct Priority

- `URGENT`: System down, security alerts
- `HIGH`: Recording errors, payment issues
- `NORMAL`: Recording ready, general updates
- `LOW`: Marketing, tips, suggestions

### 3. Provide User Preferences

Allow users to configure notification preferences:

```typescript
interface UserNotificationPreferences {
  recordingReady: {
    websocket: boolean;
    email: boolean;
    sms: boolean;
  };
  recordingError: {
    websocket: boolean;
    email: boolean;
    sms: boolean;
  };
}
```

### 4. Handle Recipient Properly

```typescript
// For WebSocket: use socketId or room
recipient: client.id

// For Email: use email address
recipient: user.email

// For SMS: use phone number
recipient: user.phoneNumber

// For multiple recipients
recipient: ['user1@example.com', 'user2@example.com']
```

## Troubleshooting

### Email Not Sending

1. Check credentials in `.env`
2. For Gmail, use App-Specific Password
3. Check firewall/network settings
4. Verify SMTP host and port
5. Check logs for specific errors

### WebSocket Not Working

1. Verify channel is registered in `afterInit`
2. Check Socket.IO server is initialized
3. Verify client is connected
4. Check console for registration message

### Channel Registration Failed

```typescript
// Check registered channels
const channels = notificationService.getRegisteredChannels();
console.log('Registered:', channels);
```

## Migration Checklist

- [ ] Install email dependencies
- [ ] Add email configuration to `.env`
- [ ] Update imports in recording module
- [ ] Update imports in recording gateway
- [ ] Update imports in recording service
- [ ] Register WebSocket channel in gateway
- [ ] Update notification calls to use new API
- [ ] Test WebSocket notifications
- [ ] Test Email notifications (if configured)
- [ ] Remove old notification service
- [ ] Update documentation
- [ ] Deploy and monitor

## Support

For issues or questions:
- Check application logs
- Verify channel health with `getChannelHealth()`
- Review environment configuration
- Check network connectivity

## Future Enhancements

- [ ] SMS channel with Twilio
- [ ] Push notifications for mobile
- [ ] Slack/Discord webhooks
- [ ] Template system with Handlebars
- [ ] Queue-based delivery with retry
- [ ] Notification preferences UI
- [ ] Analytics and delivery tracking
- [ ] A/B testing for notifications
