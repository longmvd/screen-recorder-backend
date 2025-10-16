import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecordingModule } from './modules/recording/recording.module';

@Module({
  imports: [RecordingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
