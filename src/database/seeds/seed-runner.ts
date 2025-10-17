import { DataSource } from 'typeorm';
import typeormConfig from '../../../typeorm.config';
import { seedRoles } from './1-role.seed';
import { seedPermissions } from './2-permission.seed';
import { seedAdminUser } from './3-admin-user.seed';

async function runSeeds() {
  console.log('🌱 Starting database seeding...\n');

  let dataSource: DataSource | null = null;

  try {
    // Initialize data source
    dataSource = typeormConfig;
    await dataSource.initialize();
    console.log('✓ Database connection established\n');

    // Run seeds in order
    console.log('📋 Seeding roles...');
    await seedRoles(dataSource);
    console.log('');

    console.log('🔐 Seeding permissions...');
    await seedPermissions(dataSource);
    console.log('');

    console.log('👤 Seeding admin user...');
    await seedAdminUser(dataSource);
    console.log('');

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n✓ Database connection closed');
    }
  }
}

runSeeds();
