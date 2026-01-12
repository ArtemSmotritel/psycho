import { join } from "node:path";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    name: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});

const name = values.name;

if (!name) {
  console.error("No migration name provided");
  process.exit(1);
}

const PROJECT_ROOT = join(import.meta.dir, "../..");
const MIGRATIONS_DIR = join(PROJECT_ROOT, "backend", "src", "migrations");
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, "0");
const day = now.getDate().toString().padStart(2, "0");
const hours = now.getHours().toString().padStart(2, "0");
const minutes = now.getMinutes().toString().padStart(2, "0");
const seconds = now.getSeconds().toString().padStart(2, "0");

const currentTimestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

const fileName = join(MIGRATIONS_DIR, `${currentTimestamp}_${name}.sql`);

await Bun.write(fileName, "");
