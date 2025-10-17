import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // Setup Swagger documentation (development only) - BEFORE app.listen()
  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('Screen Recorder API')
      .setDescription(
        'API documentation for Screen Recorder Backend\n\n' +
          '## WebSocket API\n\n' +
          'For real-time recording functionality, see the [WebSocket API Documentation](https://github.com/your-repo/docs/WEBSOCKET_API.md)\n\n' +
          '**WebSocket Endpoint:** ws://localhost:8000/recording\n\n' +
          '## Authentication\n\n' +
          'Most endpoints require JWT authentication. Use the /auth/login endpoint to obtain a token, ' +
          'then include it in the Authorization header as: `Bearer <token>`',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'Authentication and authorization endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Recordings', 'Recording management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Get port from environment
  const port = process.env.PORT ?? 3000;

  // Start the application
  await app.listen(port);

  // Log startup information
  if (isDevelopment) {
    logger.log(
      '📚 Swagger Documentation: http://localhost:' + port + '/api/docs',
    );
  }

  // Log startup information
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`WebSocket Gateway running on: ws://localhost:8000/recording`);

  if (isDevelopment) {
    logger.debug('Debug mode enabled');
    logger.debug(
      `Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
    );
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});
