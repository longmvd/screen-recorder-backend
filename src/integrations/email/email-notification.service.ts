import { Injectable, Logger } from '@nestjs/common';
import { INotificationChannel } from '../../core/notifications/notification-channel.interface';
import {
  NotificationChannel,
  NotificationPayload,
  BroadcastPayload,
} from '../../core/notifications/notification.types';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

@Injectable()
export class EmailNotificationService implements INotificationChannel {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: Transporter;
  private config: EmailConfig;

  constructor() {
    // Load config from environment variables
    this.config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    };

    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (!this.config.auth.user || !this.config.auth.pass) {
      this.logger.warn(
        'Email credentials not configured. Email notifications will be disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    this.logger.log('Email transporter initialized');
  }

  getChannelName(): NotificationChannel {
    return NotificationChannel.EMAIL;
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.EMAIL;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error(`Email transporter health check failed: ${error}`);
      return false;
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    const recipients = Array.isArray(payload.recipient)
      ? payload.recipient
      : [payload.recipient];

    for (const recipient of recipients) {
      const mailOptions = this.buildEmailFromPayload(recipient, payload);

      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent to ${recipient}: ${payload.event}`);
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${recipient}: ${error.message}`,
        );
        throw error;
      }
    }
  }

  async broadcast(payload: BroadcastPayload): Promise<void> {
    // Email broadcasting is not supported (no recipient list)
    this.logger.warn(
      'Email broadcast not supported - requires specific recipients',
    );
    throw new Error('Email channel does not support broadcast');
  }

  private buildEmailFromPayload(
    recipient: string,
    payload: NotificationPayload,
  ): any {
    const { event, category, data } = payload;

    // Use template if specified
    if (payload.metadata?.templateId) {
      return this.buildEmailFromTemplate(
        recipient,
        payload.metadata.templateId,
        data,
      );
    }

    // Default email structure based on event type
    switch (event) {
      case 'recordingReady':
        return this.buildRecordingReadyEmail(recipient, data);
      case 'recordingError':
        return this.buildRecordingErrorEmail(recipient, data);
      default:
        return this.buildGenericEmail(recipient, event, category, data);
    }
  }

  private buildRecordingReadyEmail(recipient: string, data: any): any {
    return {
      from: this.config.from,
      to: recipient,
      subject: 'Your Recording is Ready',
      html: `
        <h2>Recording Ready for Download</h2>
        <p>Your screen recording has been processed and is ready to download.</p>
        <p><strong>Recording ID:</strong> ${data.recordId}</p>
        <p><strong>Duration:</strong> ${Math.round(data.duration)}s</p>
        <p><strong>Size:</strong> ${this.formatBytes(data.size)}</p>
        <p>
          <a href="${data.downloadUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Download Recording
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">
          This link will expire in 7 days.
        </p>
      `,
      text: `
        Recording Ready for Download
        
        Your screen recording has been processed and is ready to download.
        
        Recording ID: ${data.recordId}
        Duration: ${Math.round(data.duration)}s
        Size: ${this.formatBytes(data.size)}
        
        Download URL: ${data.downloadUrl}
        
        This link will expire in 7 days.
      `,
    };
  }

  private buildRecordingErrorEmail(recipient: string, data: any): any {
    return {
      from: this.config.from,
      to: recipient,
      subject: 'Recording Processing Error',
      html: `
        <h2>Recording Processing Failed</h2>
        <p>Unfortunately, there was an error processing your recording.</p>
        <p><strong>Recording ID:</strong> ${data.recordId}</p>
        <p><strong>Error:</strong> ${data.error}</p>
        <p>Please try recording again. If the issue persists, contact support.</p>
      `,
      text: `
        Recording Processing Failed
        
        Unfortunately, there was an error processing your recording.
        
        Recording ID: ${data.recordId}
        Error: ${data.error}
        
        Please try recording again. If the issue persists, contact support.
      `,
    };
  }

  private buildGenericEmail(
    recipient: string,
    event: string,
    category: string,
    data: any,
  ): any {
    return {
      from: this.config.from,
      to: recipient,
      subject: `Notification: ${event}`,
      html: `
        <h2>${event}</h2>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Details:</strong></p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `,
      text: `
        ${event}
        
        Category: ${category}
        
        Details:
        ${JSON.stringify(data, null, 2)}
      `,
    };
  }

  private buildEmailFromTemplate(
    recipient: string,
    templateId: string,
    data: any,
  ): any {
    // TODO: Implement template system with Handlebars
    this.logger.warn(`Template system not implemented: ${templateId}`);
    return this.buildGenericEmail(recipient, 'Notification', 'generic', data);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
