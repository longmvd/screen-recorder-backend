import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import entities
import { User } from '../../modules/user/entities/user.entity';
import { UserProfile } from '../../modules/user/entities/user-profile.entity';
import { UserOAuthProvider } from '../../modules/user/entities/user-oauth-provider.entity';
import { Role } from '../../modules/role/entities/role.entity';
import { Permission } from '../../modules/role/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DATABASE_TYPE', 'mysql');

        const baseConfig = {
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: configService.get<number>('DATABASE_PORT', 3306),
          username: configService.get<string>('DATABASE_USERNAME', 'root'),
          password: configService.get<string>('DATABASE_PASSWORD', ''),
          database: configService.get<string>(
            'DATABASE_NAME',
            'screen_recorder',
          ),
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('DATABASE_SYNC') === 'true',
          logging: configService.get<string>('DATABASE_LOGGING') === 'true',
          migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
          migrationsRun: false,
        };

        if (dbType === 'postgres' || dbType === 'postgresql') {
          return {
            ...baseConfig,
            type: 'postgres' as const,
          };
        }

        if (dbType === 'mysql') {
          return {
            ...baseConfig,
            type: 'mysql' as const,
          };
        }

        throw new Error(`Unsupported database type: ${dbType}`);
      },
    }),
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserOAuthProvider,
      Role,
      Permission,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
