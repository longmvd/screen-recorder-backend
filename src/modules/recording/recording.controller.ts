import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { type Response } from 'express';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import { type IStorageService } from '../../integrations/storage/storage.interface';
import { STORAGE_SERVICE } from '../../integrations/storage/storage.token';

@ApiTags('Recordings')
@Controller('recordings')
export class RecordingController {
  private readonly logger = new Logger(RecordingController.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Get('download/:key')
  @ApiOperation({
    summary: 'Download a recording file',
    description: 'Download a recorded video file by its storage key',
  })
  @ApiParam({
    name: 'key',
    description: 'Recording storage key (URL encoded)',
    example: 'abc123/final.webm',
  })
  @ApiProduces('video/webm')
  @ApiResponse({
    status: 200,
    description: 'Recording file stream',
    content: {
      'video/webm': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Recording not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Recording not found: abc123/final.webm',
        error: 'Not Found',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get recording status',
    description: 'Check if a recording is ready for download',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Recording ID',
    example: 'abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Recording status information',
    schema: {
      oneOf: [
        {
          properties: {
            recordId: { type: 'string', example: 'abc123' },
            status: { type: 'string', example: 'ready' },
            downloadUrl: {
              type: 'string',
              example: '/recordings/download/abc123%2Ffinal.webm',
            },
          },
        },
        {
          properties: {
            recordId: { type: 'string', example: 'abc123' },
            status: { type: 'string', example: 'not_found' },
            message: {
              type: 'string',
              example: 'Recording not found or still processing',
            },
          },
        },
        {
          properties: {
            recordId: { type: 'string', example: 'abc123' },
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Error message' },
          },
        },
      ],
    },
  })
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
