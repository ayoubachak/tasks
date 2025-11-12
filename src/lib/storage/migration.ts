import { storage } from './localStorage';

export interface Migration {
  version: string;
  up: () => void;
  down?: () => void;
}

const migrations: Migration[] = [
  // Add migrations here as the app evolves
  // Example:
  // {
  //   version: '1.1.0',
  //   up: () => {
  //     // Migration logic
  //   },
  // },
];

export function runMigrations(fromVersion: string, toVersion: string): void {
  console.log(`Running migrations from ${fromVersion} to ${toVersion}`);
  
  // Sort migrations by version
  const sortedMigrations = migrations.sort((a, b) => 
    a.version.localeCompare(b.version)
  );

  // Run migrations in order
  for (const migration of sortedMigrations) {
    if (migration.version > fromVersion && migration.version <= toVersion) {
      try {
        migration.up();
        console.log(`Migration ${migration.version} completed`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }
}

