import { Injectable } from '@nestjs/common';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecordingService {
  constructor() {}

  async startRecording(recordId: string) {
    const dir = path.join('/tmp', recordId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log(`Started recording: ${recordId}`);
  }

  async saveChunk(recordId: string, chunk: Buffer, index: number) {
    const dir = path.join('/tmp', recordId);
    const filename = path.join(
      dir,
      `chunk-${index.toString().padStart(3, '0')}.webm`,
    );
    await fs.promises.writeFile(filename, chunk);
  }

  async finishRecording(recordId: string) {
    console.log(`Finished recording: ${recordId}`);
    // FFmpeg and MinIO logic will be added here
  }
}
