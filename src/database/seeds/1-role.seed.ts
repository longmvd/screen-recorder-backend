import { DataSource } from 'typeorm';
import { Role } from '../../modules/role/entities/role.entity';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);

  const roles = [
    {
      name: 'admin',
      description: 'Administrator with full system access',
    },
    {
      name: 'user',
      description: 'Regular user with basic access',
    },
    {
      name: 'moderator',
      description: 'Moderator with limited administrative access',
    },
  ];

  for (const roleData of roles) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleData.name },
    });

    if (!existingRole) {
      const role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`✓ Created role: ${roleData.name}`);
    } else {
      console.log(`- Role already exists: ${roleData.name}`);
    }
  }
}
