import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';
import { type StorageConfig } from '../../config/storage.config';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: StorageConfig) {
    this.basePath = config.localPath;
    // Base URL for downloads - will be served by the API
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

    // Ensure storage directory exists
    this.ensureDirectoryExists(this.basePath);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created storage directory: ${dirPath}`);
    }
  }

  async save(sourcePath: string, destinationKey: string): Promise<string> {
    try {
      const destPath = path.join(this.basePath, destinationKey);
      const destDir = path.dirname(destPath);

      // Ensure destination directory exists
      this.ensureDirectoryExists(destDir);

      // Copy file from source to destination
      await fs.promises.copyFile(sourcePath, destPath);

      this.logger.log(`File saved: ${destinationKey}`);

      // Return download URL
      return this.getDownloadUrl(destinationKey);
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  }

  async getDownloadUrl(key: string): Promise<string> {
    // Return API endpoint URL for downloading
    const encodedKey = encodeURIComponent(key);
    return `${this.baseUrl}/recordings/download/${encodedKey}`;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    return fs.existsSync(filePath);
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`File deleted: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  async getFilePath(key: string): Promise<string> {
    const filePath = path.join(this.basePath, key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }

    return filePath;
  }
}
