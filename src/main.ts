import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Create app with logging options
  const app = await NestFactory.create(AppModule, {
    logger: isDevelopment
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : ['log', 'error', 'warn'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for development
  if (isDevelopment) {
    app.enableCors({
      origin: '*',
      credentials: true,
    });
    logger.debug('CORS enabled for development');
  }

  // Get port from environment
  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  // Log startup information
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`WebSocket Gateway running on: ws://localhost:8000/recording`);

  if (isDevelopment) {
    logger.debug('Debug mode enabled');
    logger.debug(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});
