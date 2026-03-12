import { afterAll, beforeAll, beforeEach } from 'bun:test'
import { testDb, ALL_APP_TABLES } from './test-fixtures/db'

beforeAll(async () => {
    // Run app migrations (idempotent — only applies pending ones).
    // better-auth tables must already exist from the one-time manual setup step.
    const proc = Bun.spawn(['bun', 'run', 'migrate'], {
        cwd: import.meta.dir + '/..',
        env: { ...process.env },
        stdout: 'inherit',
        stderr: 'inherit',
    })
    const code = await proc.exited
    if (code !== 0) throw new Error('Migrations failed — cannot run tests')
}, 30_000)

beforeEach(async () => {
    const tables = ALL_APP_TABLES.join(', ')
    await testDb.unsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
})

afterAll(async () => {
    await testDb.close()
})
