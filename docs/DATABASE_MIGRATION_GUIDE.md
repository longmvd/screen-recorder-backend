# Database Migration & Seeding Guide

This guide explains how to use the database migration and seeding system for the Screen Recorder Backend.

## 📋 Overview

The project uses TypeORM for database migrations and a custom seeding system to manage database schema and initial data.

## 🗂️ File Structure

```
screen-recorder-backend/
├── typeorm.config.ts                    # TypeORM CLI configuration
├── src/
│   └── database/
│       ├── migrations/                   # Auto-generated migration files
│       │   └── 1760671011880-InitialSchema.ts
│       └── seeds/                        # Custom seed files
│           ├── 1-role.seed.ts           # Seed roles
│           ├── 2-permission.seed.ts     # Seed permissions
│           ├── 3-admin-user.seed.ts     # Seed admin user
│           └── seed-runner.ts           # Execute all seeds
```

## 🚀 Available Commands

### Migration Commands

```bash
# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create an empty migration file
npm run migration:create -- src/database/migrations/MigrationName

# Run all pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Seeding Commands

```bash
# Run all seed files
npm run seed:run
```

## 📝 Initial Setup

### Step 1: Create Database Tables

Run the migration to create all database tables:

```bash
npm run migration:run
```

This will create the following tables:
- `users` - User accounts
- `user_profiles` - User profile information
- `user_oauth_providers` - OAuth provider connections
- `roles` - User roles
- `permissions` - System permissions
- `role_permissions` - Role-permission relationships
- `migrations` - Migration tracking

### Step 2: Seed Initial Data

Run the seeder to populate initial data:

```bash
npm run seed:run
```

This will create:

**Roles:**
- `admin` - Administrator with full system access
- `user` - Regular user with basic access
- `moderator` - Moderator with limited administrative access

**Permissions (17 total):**
- `users:create`, `users:read`, `users:update`, `users:delete`
- `roles:create`, `roles:read`, `roles:update`, `roles:delete`
- `permissions:create`, `permissions:read`, `permissions:update`, `permissions:delete`
- `recordings:create`, `recordings:read`, `recordings:update`, `recordings:delete`
- `system:settings`

**Admin User:**
- Email: `admin@example.com`
- Password: `Admin@123`
- ⚠️ **IMPORTANT:** Change this password after first login!

## 🔄 Workflow Examples

### Example 1: Adding a New Entity

1. Create your entity file (e.g., `src/modules/video/entities/video.entity.ts`)

2. Add the entity to `src/core/database/database.module.ts`:
```typescript
TypeOrmModule.forFeature([
  // ... existing entities
  Video,
]),
```

3. Generate a migration:
```bash
npm run migration:generate -- src/database/migrations/AddVideoEntity
```

4. Review the generated migration file

5. Run the migration:
```bash
npm run migration:run
```

### Example 2: Modifying an Existing Entity

1. Update your entity file (e.g., add a new column)

2. Generate a migration:
```bash
npm run migration:generate -- src/database/migrations/AddVideoThumbnail
```

3. Run the migration:
```bash
npm run migration:run
```

### Example 3: Rolling Back a Migration

If you need to undo the last migration:

```bash
npm run migration:revert
```

### Example 4: Creating a Custom Seed

1. Create a new seed file: `src/database/seeds/4-custom.seed.ts`

```typescript
import { DataSource } from 'typeorm';
import { YourEntity } from '../../modules/your-module/entities/your.entity';

export async function seedCustomData(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(YourEntity);
  
  // Your seed logic here
  const data = { /* ... */ };
  const entity = repository.create(data);
  await repository.save(entity);
  
  console.log('✓ Custom data seeded');
}
```

2. Add it to `seed-runner.ts`:

```typescript
import { seedCustomData } from './4-custom.seed';

// In runSeeds function:
console.log('📦 Seeding custom data...');
await seedCustomData(dataSource);
```

3. Run the seeder:
```bash
npm run seed:run
```

## 🔐 Seeded Data Reference

### Default Admin Credentials

```
Email: admin@example.com
Password: Admin@123
```

### Permission Naming Convention

Permissions follow the pattern: `resource:action`

Examples:
- `users:create` - Create users
- `recordings:read` - View recordings
- `system:settings` - Manage system settings

## ⚠️ Important Notes

1. **Environment Configuration**
   - Migrations use the `.env.development` file for database connection
   - Make sure your database credentials are correct in this file

2. **Migration Safety**
   - Always review generated migrations before running them
   - Test migrations in development before applying to production
   - Keep migration files in version control

3. **Seed Idempotency**
   - Seed files check for existing data before inserting
   - Running seeds multiple times won't create duplicates
   - Safe to run `npm run seed:run` multiple times

4. **Production Deployment**
   - Create a `.env.production` file with production database credentials
   - Update `typeorm.config.ts` to use production config when needed
   - Always backup your database before running migrations in production

## 🛠️ Troubleshooting

### Issue: "Field doesn't have a default value"

This means your entity has required fields without default values. Either:
- Add default values in the entity definition
- Provide all required fields in your seed data

### Issue: "Migration already exists"

The migration has already been run. Check with:
```bash
npm run migration:show
```

To revert and re-run:
```bash
npm run migration:revert
npm run migration:run
```

### Issue: "Cannot find module"

Make sure all dependencies are installed:
```bash
npm install
```

## 📚 Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [TypeORM CLI Documentation](https://typeorm.io/using-cli)
- [NestJS TypeORM Integration](https://docs.nestjs.com/techniques/database)

## ✅ Success Checklist

After setup, you should have:
- [x] All database tables created
- [x] 3 roles (admin, user, moderator)
- [x] 17 permissions
- [x] 1 admin user account
- [x] All permissions assigned to admin role

You can verify by checking your database directly or using the application's API endpoints.
