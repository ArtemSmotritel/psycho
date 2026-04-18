import { $ } from 'bun'
import { join } from 'node:path'

const { PGUSERNAME, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env

if (!PGUSERNAME || !PGHOST || !PGPORT || !PGDATABASE) {
    console.error('Missing PG* env vars. Set PGUSERNAME, PGPASSWORD, PGHOST, PGPORT, PGDATABASE.')
    process.exit(1)
}

const snapshotsDir = join(import.meta.dir, 'snapshots')
const ts = new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '')
const outPath = join(snapshotsDir, `snapshot-${ts}.sql`)

console.log(`Dumping ${PGDATABASE} @ ${PGHOST}:${PGPORT} → ${outPath}`)

try {
    await $`pg_dump -h ${PGHOST} -p ${PGPORT} -U ${PGUSERNAME} -d ${PGDATABASE} --clean --if-exists --no-owner --no-privileges --format=plain --file=${outPath}`.env(
        { ...process.env, PGPASSWORD: PGPASSWORD ?? '' },
    )
    const size = Bun.file(outPath).size
    console.log(`✓ Snapshot saved (${(size / 1024).toFixed(1)} KB)`)
} catch (err) {
    console.error('pg_dump failed:', err)
    process.exit(1)
}
