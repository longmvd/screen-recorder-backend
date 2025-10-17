import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/user/entities/user.entity';
import { UserProfile } from '../../modules/user/entities/user-profile.entity';
import { Role } from '../../modules/role/entities/role.entity';
import { Permission } from '../../modules/role/entities/permission.entity';

export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const profileRepository = dataSource.getRepository(UserProfile);
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // Check if admin user already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('- Admin user already exists');
    return;
  }

  // Get admin role
  const adminRole = await roleRepository.findOne({
    where: { name: 'admin' },
    relations: ['permissions'],
  });

  if (!adminRole) {
    console.log('✗ Admin role not found. Please run role seeder first.');
    return;
  }

  // Get all permissions for admin
  const allPermissions = await permissionRepository.find();
  adminRole.permissions = allPermissions;
  await roleRepository.save(adminRole);

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Create admin user
  const adminUser = userRepository.create({
    email: 'admin@example.com',
    password: hashedPassword,
    emailVerified: true,
    roles: ['admin'],
  });

  await userRepository.save(adminUser);

  // Create admin profile
  const adminProfile = profileRepository.create({
    user: adminUser,
    firstName: 'System',
    lastName: 'Administrator',
  });

  await profileRepository.save(adminProfile);

  console.log('✓ Created admin user:');
  console.log('  Email: admin@example.com');
  console.log('  Password: Admin@123');
  console.log('  ⚠️  Please change the password after first login!');
}
