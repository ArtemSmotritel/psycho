import { SQL } from 'bun'

export const testDb = new SQL({
    url: `postgres://${process.env.PGUSERNAME}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`,
    max: 5,
})

// All app tables. Exclude schema_migrations.
// WITH CASCADE, order does not matter for TRUNCATE.
export const ALL_APP_TABLES = [
    'appointments',
    'psychologist_clients',
    'clients',
    'psychologists',
    'session',
    'account',
    'verification',
    '"user"',
]
