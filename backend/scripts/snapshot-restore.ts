import { $ } from 'bun'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const { PGUSERNAME, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env

if (!PGUSERNAME || !PGHOST || !PGPORT || !PGDATABASE) {
    console.error('Missing PG* env vars. Set PGUSERNAME, PGPASSWORD, PGHOST, PGPORT, PGDATABASE.')
    process.exit(1)
}

const snapshotsDir = join(import.meta.dir, 'snapshots')
const argPath = process.argv[2]

let target: string
if (argPath) {
    target = argPath.startsWith('/') ? argPath : join(process.cwd(), argPath)
} else {
    const entries = await readdir(snapshotsDir)
    const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort()
    if (sqlFiles.length === 0) {
        console.error(`No snapshot files found in ${snapshotsDir}. Run snapshot:save first.`)
        process.exit(1)
    }
    target = join(snapshotsDir, sqlFiles[sqlFiles.length - 1]!)
}

const file = Bun.file(target)
if (!(await file.exists())) {
    console.error(`Snapshot file not found: ${target}`)
    process.exit(1)
}

console.log(`Restoring ${PGDATABASE} @ ${PGHOST}:${PGPORT} ← ${target}`)

try {
    await $`psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSERNAME} -d ${PGDATABASE} -v ON_ERROR_STOP=1 -f ${target}`.env(
        { ...process.env, PGPASSWORD: PGPASSWORD ?? '' },
    )
    console.log('✓ Snapshot restored')
} catch (err) {
    console.error('psql restore failed:', err)
    process.exit(1)
}
