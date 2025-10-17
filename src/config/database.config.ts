import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const dbType = process.env.DATABASE_TYPE || 'mysql';

  const baseConfig = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'screen_recorder',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.DATABASE_SYNC === 'true', // Only for development
    logging: process.env.DATABASE_LOGGING === 'true',
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: false,
  };

  if (dbType === 'postgres' || dbType === 'postgresql') {
    return {
      ...baseConfig,
      type: 'postgres',
    };
  }

  if (dbType === 'mysql') {
    return {
      ...baseConfig,
      type: 'mysql',
    };
  }

  throw new Error(`Unsupported database type: ${dbType}`);
};
