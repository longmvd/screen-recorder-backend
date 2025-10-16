import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  /**
   * Merge WebM chunks into a single video file
   * @param recordId - Recording ID
   * @param tempDir - Temporary directory containing chunks
   * @param outputPath - Output file path
   * @returns Path to merged video
   */
  async mergeChunks(
    recordId: string,
    tempDir: string,
    outputPath: string,
  ): Promise<string> {
    const chunkDir = path.join(tempDir, recordId);

    try {
      // Get all chunk files sorted by index
      const chunkFiles = await this.getChunkFiles(chunkDir);

      if (chunkFiles.length === 0) {
        throw new Error(`No chunks found for recording: ${recordId}`);
      }

      this.logger.log(
        `Merging ${chunkFiles.length} chunks for recording: ${recordId}`,
      );

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create concat list file
      const listPath = path.join(chunkDir, 'concat-list.txt');
      await this.createConcatList(chunkFiles, listPath);

      // Merge using FFmpeg concat demuxer
      await this.executeFfmpegConcat(listPath, outputPath);

      // Clean up list file
      await fs.promises.unlink(listPath);

      this.logger.log(`Successfully merged chunks to: ${outputPath}`);

      return outputPath;
    } catch (error) {
      this.logger.error(
        `Failed to merge chunks for ${recordId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get sorted chunk files from directory
   */
  private async getChunkFiles(chunkDir: string): Promise<string[]> {
    if (!fs.existsSync(chunkDir)) {
      return [];
    }

    const files = await fs.promises.readdir(chunkDir);

    // Filter and sort chunk files
    return files
      .filter((file) => file.startsWith('chunk-') && file.endsWith('.webm'))
      .sort()
      .map((file) => path.join(chunkDir, file));
  }

  /**
   * Create FFmpeg concat list file
   */
  private async createConcatList(
    chunkFiles: string[],
    listPath: string,
  ): Promise<void> {
    const content = chunkFiles
      .map((file) => `file '${file.replace(/\\/g, '/')}'`)
      .join('\n');

    await fs.promises.writeFile(listPath, content, 'utf-8');
  }

  /**
   * Execute FFmpeg concat command
   */
  private executeFfmpegConcat(
    listPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy']) // Copy codec - no re-encoding
        .output(outputPath)
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.logger.debug(`Processing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          this.logger.log('FFmpeg merge completed');
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(
    filePath: string,
  ): Promise<{ duration: number; size: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 0;
        const size = metadata.format.size || 0;

        resolve({ duration, size });
      });
    });
  }
}
