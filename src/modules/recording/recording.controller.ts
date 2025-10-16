import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
  StreamableFile,
  Inject,
} from '@nestjs/common';
import { type Response } from 'express';
import { type IStorageService } from '../../intergrations/storage/storage.interface';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import { STORAGE_SERVICE } from '../../intergrations/storage/storage.token';

@Controller('recordings')
export class RecordingController {
  private readonly logger = new Logger(RecordingController.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Get('download/:key')
  async download(
    @Param('key') key: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      // Decode the key
      const decodedKey = decodeURIComponent(key);

      // Check if file exists
      const exists = await this.storageService.exists(decodedKey);
      if (!exists) {
        throw new NotFoundException(`Recording not found: ${decodedKey}`);
      }

      // Get file path
      const filePath = await this.storageService.getFilePath(decodedKey);

      // Get file stats
      const stat = fs.statSync(filePath);

      // Set response headers
      res.set({
        'Content-Type': 'video/webm',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${decodedKey.replace(/\//g, '-')}"`,
        'Accept-Ranges': 'bytes',
      });

      this.logger.log(`Streaming file: ${decodedKey}`);

      // Create and return stream
      const file = createReadStream(filePath);
      return new StreamableFile(file);
    } catch (error) {
      this.logger.error(`Download error: ${error.message}`);
      throw error;
    }
  }

  @Get(':recordId/status')
  async getStatus(@Param('recordId') recordId: string) {
    try {
      const key = `${recordId}/final.webm`;
      const exists = await this.storageService.exists(key);

      if (!exists) {
        return {
          recordId,
          status: 'not_found',
          message: 'Recording not found or still processing',
        };
      }

      const downloadUrl = await this.storageService.getDownloadUrl(key);

      return {
        recordId,
        status: 'ready',
        downloadUrl,
      };
    } catch (error) {
      this.logger.error(`Status check error: ${error.message}`);
      return {
        recordId,
        status: 'error',
        message: error.message,
      };
    }
  }
}
