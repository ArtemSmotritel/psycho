// psycho/backend/scripts/run-migrations.ts
import { db } from "config/db";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const PROJECT_ROOT = join(import.meta.dir, "../..");

const MIGRATIONS_DIR = join(PROJECT_ROOT, "backend/src/migrations");
const SCHEMA_MIGRATIONS_TABLE = "schema_migrations";

async function runMigrations() {
  try {
    console.log("Connected to the database.");

    // 1. Ensure the schema_migrations table exists
    await db`
            CREATE TABLE IF NOT EXISTS ${db(SCHEMA_MIGRATIONS_TABLE)} (
                name VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
    console.log(`Ensured table ${SCHEMA_MIGRATIONS_TABLE} exists.`);

    // 2. Get applied migrations
    const appliedMigrationsResult =
      await db`SELECT name FROM ${db(SCHEMA_MIGRATIONS_TABLE)};`;
    console.log(appliedMigrationsResult);
    const appliedMigrations = new Set(
      appliedMigrationsResult.map((row: any) => row.name),
    );
    console.log("Applied migrations:", Array.from(appliedMigrations));

    // 3. Read migration files from the directory using Bun's native API
    let migrationFiles: string[] = [];
    try {
      const files = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
      for (const entry of files) {
        if (entry.isFile()) {
          migrationFiles.push(entry.name);
        } else {
          console.error(`${entry} is not a file.`);
        }
      }
    } catch (readError) {
      console.log(readError);
      if ((readError as NodeJS.ErrnoException).code === "ENOENT") {
        console.error(
          `No migrations directory found at ${MIGRATIONS_DIR}. No migrations to run.`,
        );
        return; // Exit gracefully if no migrations directory exists
      }
      throw readError; // Re-throw other errors
    }

    const sortedMigrationFiles = migrationFiles
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (sortedMigrationFiles.length === 0) {
      console.log(
        "No SQL migration files found in the directory. No migrations to run.",
      );
      return;
    }

    console.log("Found migration files:", sortedMigrationFiles);

    // 4. Identify and execute pending migrations
    for (const file of sortedMigrationFiles) {
      if (!appliedMigrations.has(file)) {
        console.log(`Applying migration: ${file}`);
        const filePath = join(MIGRATIONS_DIR, file);

        await db.begin(async (tx) => {
          try {
            await db.file(filePath);

            const record = { name: file };
            await db`INSERT INTO ${db(SCHEMA_MIGRATIONS_TABLE)} ${db(record)}`;

            console.log(`Successfully applied migration: ${file}`);
          } catch (error) {
            console.error(`Error applying migration ${file}:`, error);
            throw error;
          }
        });
      } else {
        console.log(`Migration ${file} already applied. Skipping.`);
      }
    }

    console.log("All migrations processed.");
  } catch (error) {
    console.error("Migration process failed:", error);
    process.exit(1); // Exit with a non-zero code on failure
  } finally {
    try {
      await db.close();
      console.log("Database connection closed.");
    } catch (closeError) {
      console.error("Error closing database connection:", closeError);
    }
  }
}

await runMigrations();
