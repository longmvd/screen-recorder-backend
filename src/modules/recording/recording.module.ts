import { Module } from '@nestjs/common';
import { RecordingGateway } from './recording.gateway';
import { RecordingService } from './recording.service';

@Module({
  providers: [RecordingGateway, RecordingService],
})
export class RecordingModule {}
