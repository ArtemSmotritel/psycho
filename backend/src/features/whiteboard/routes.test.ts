import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { websocket } from 'config/websocket'
import { testDb } from '../../test-fixtures/db'
import { futureDate } from '../../test-fixtures/dates'
import { createAppointment, startAppointment } from '../../test-fixtures/appointments'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { ClientsService } from '../clients/services'
import { MAX_MESSAGES_PER_WINDOW, SAVE_DELAY_MS } from './limits'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }

let server: ReturnType<typeof Bun.serve>
const openSockets: TestSocket[] = []

beforeAll(() => {
    server = Bun.serve({ fetch: app.fetch, websocket, port: 0 })
})

afterEach(async () => {
    await Promise.all(openSockets.splice(0).map((s) => s.close()))
})

afterAll(async () => {
    await server.stop(true)
})

class TestSocket {
    private queue: any[] = []
    private waiters: Array<() => void> = []
    closeInfo: { code: number; reason: string } | null = null

    private constructor(private ws: WebSocket) {
        ws.onmessage = (event) => {
            this.queue.push(JSON.parse(event.data as string))
            this.wake()
        }
        ws.onclose = (event) => {
            this.closeInfo = { code: event.code, reason: event.reason }
            this.wake()
        }
    }

    static async connect(appointmentId: string, headers: Record<string, string>) {
        const ws = new (WebSocket as any)(
            `ws://localhost:${server.port}/api/whiteboard/${appointmentId}`,
            { headers },
        ) as WebSocket
        const socket = new TestSocket(ws)
        await new Promise<void>((resolve) => {
            ws.onopen = () => resolve()
            const previous = ws.onclose
            ws.onclose = (event) => {
                ;(previous as any)?.call(ws, event)
                resolve()
            }
        })
        openSockets.push(socket)
        return socket
    }

    private wake() {
        for (const w of this.waiters.splice(0)) w()
    }

    send(message: unknown) {
        this.ws.send(JSON.stringify(message))
    }

    /** Takes the first queued message of this type. Waits for one if none is queued. */
    async take(type: string, timeoutMs = 3000): Promise<any> {
        const deadline = Date.now() + timeoutMs
        while (true) {
            const index = this.queue.findIndex((m) => m.type === type)
            if (index >= 0) return this.queue.splice(index, 1)[0]
            const remaining = deadline - Date.now()
            if (remaining <= 0) throw new Error(`Timed out waiting for "${type}" message`)
            await new Promise<void>((resolve) => {
                this.waiters.push(resolve)
                setTimeout(resolve, remaining)
            })
        }
    }

    /** Resolves true if no message of this type arrives within the wait. */
    async expectNone(type: string, waitMs = 250): Promise<boolean> {
        await Bun.sleep(waitMs)
        return !this.queue.some((m) => m.type === type)
    }

    async waitClosed(timeoutMs = 3000) {
        const deadline = Date.now() + timeoutMs
        while (!this.closeInfo) {
            if (Date.now() > deadline) throw new Error('Timed out waiting for close')
            await new Promise<void>((resolve) => {
                this.waiters.push(resolve)
                setTimeout(resolve, 50)
            })
        }
        return this.closeInfo
    }

    /** Sends `sync` with no files and returns the reply. */
    async syncEmpty() {
        this.send({ type: 'sync', fileIds: [] })
        return this.take('sync_reply')
    }

    async close() {
        if (this.ws.readyState === WebSocket.OPEN) this.ws.close()
        await this.waitClosed().catch(() => undefined)
    }
}

const el = (id: string, version: number, versionNonce = 1, extra = {}) => ({
    id,
    version,
    versionNonce,
    type: 'rectangle',
    ...extra,
})

const img = (id: string) => ({ id, mimeType: 'image/png', dataURL: `data:image/png;base64,${id}` })

async function setupSession() {
    const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
    const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
    await ClientsService.linkClientToPsycho(client.id, psycho.id)
    const apt = await createAppointment({
        psychoId: psycho.id,
        clientId: client.id,
        startTime: futureDate(7),
        endTime: futureDate(7, 11),
    })
    await startAppointment(apt.id)
    const psychoHeaders = (await asUser(psycho.id)).headers as Record<string, string>
    const clientHeaders = (await asUser(client.id)).headers as Record<string, string>
    return { psycho, client, apt, psychoHeaders, clientHeaders }
}

async function readElements(appointmentId: string): Promise<any[] | null> {
    const [row] = await testDb`
        SELECT whiteboard_elements AS elements FROM appointments WHERE id = ${appointmentId}
    `
    // Bun can return a jsonb value as text.
    return typeof row.elements === 'string' ? JSON.parse(row.elements) : row.elements
}

async function readFileIds(appointmentId: string): Promise<string[]> {
    const rows = await testDb`
        SELECT file_id FROM whiteboard_files WHERE appointment_id = ${appointmentId}
        ORDER BY file_id
    `
    return rows.map((r: any) => r.file_id)
}

async function waitFor<T>(read: () => Promise<T>, done: (v: T) => boolean, timeoutMs = 4000) {
    const deadline = Date.now() + timeoutMs
    while (true) {
        const value = await read()
        if (done(value)) return value
        if (Date.now() > deadline) throw new Error('Timed out waiting for database state')
        await Bun.sleep(50)
    }
}

describe('whiteboard WebSocket: access', () => {
    it('closes an unauthenticated connection with 1008 Unauthorized', async () => {
        const { apt } = await setupSession()
        const socket = await TestSocket.connect(apt.id, {})
        expect(await socket.waitClosed()).toEqual({ code: 1008, reason: 'Unauthorized' })
    })

    it('closes with 1008 NotFound for an appointment of another user', async () => {
        const { apt } = await setupSession()
        const stranger = await insertTestUser({ email: 'x@test.com', activeRole: 'psycho' })
        const headers = (await asUser(stranger.id)).headers as Record<string, string>
        const socket = await TestSocket.connect(apt.id, headers)
        expect(await socket.waitClosed()).toEqual({ code: 1008, reason: 'NotFound' })
    })

    it('closes with 1008 AppointmentNotActive when the appointment has not started', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        const headers = (await asUser(psycho.id)).headers as Record<string, string>
        const socket = await TestSocket.connect(apt.id, headers)
        expect(await socket.waitClosed()).toEqual({ code: 1008, reason: 'AppointmentNotActive' })
    })

    it('closes with 1008 Forbidden for a browser request from another origin', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const original = process.env.FRONTEND_URL
        process.env.FRONTEND_URL = 'http://allowed.example'
        try {
            const socket = await TestSocket.connect(apt.id, {
                ...psychoHeaders,
                Origin: 'http://evil.example',
            })
            expect(await socket.waitClosed()).toEqual({ code: 1008, reason: 'Forbidden' })
        } finally {
            process.env.FRONTEND_URL = original
        }
    })
})

describe('whiteboard WebSocket: sync and merge', () => {
    it('answers an empty sync on a new board with an empty reply', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)

        const reply = await a.syncEmpty()

        expect(reply).toEqual({ type: 'sync_reply', elements: [], wantFiles: [] })
    })

    it('relays accepted elements to the other user and not back to the sender', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [el('e1', 1)] })

        const received = await b.take('elements')
        expect(received.elements.map((e: any) => e.id)).toEqual(['e1'])
        expect(await a.expectNone('elements')).toBe(true)
    })

    it('keeps both strokes when two users draw at the same time', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [el('from-a', 1)] })
        b.send({ type: 'elements', elements: [el('from-b', 1)] })

        expect((await b.take('elements')).elements[0].id).toBe('from-a')
        expect((await a.take('elements')).elements[0].id).toBe('from-b')

        const late = await TestSocket.connect(apt.id, psychoHeaders)
        const reply = await late.syncEmpty()
        expect(reply.elements.map((e: any) => e.id).sort()).toEqual(['from-a', 'from-b'])
    })

    it('sends the newer server copy back to a sender with a stale element', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [el('e1', 5, 1, { x: 50 })] })
        await b.take('elements')
        b.send({ type: 'elements', elements: [el('e1', 2, 1, { x: 20 })] })

        const correction = await b.take('elements')
        expect(correction.elements[0]).toMatchObject({ id: 'e1', version: 5, x: 50 })
        expect(await a.expectNone('elements')).toBe(true)
    })

    it('does not relay a duplicate revision', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [el('e1', 1)] })
        await b.take('elements')
        a.send({ type: 'elements', elements: [el('e1', 1)] })

        expect(await b.expectNone('elements')).toBe(true)
    })

    it('sends the whole scene on sync and accepts the reconnecting client resending its own', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()
        a.send({ type: 'elements', elements: [el('shared', 1), el('missed-by-b', 1)] })
        await b.take('elements')

        // b reconnects after a changed "shared". b holds an offline-only element.
        await b.close()
        a.send({ type: 'elements', elements: [el('shared', 3)] })
        const b2 = await TestSocket.connect(apt.id, clientHeaders)
        const reply = await b2.syncEmpty()
        expect(reply.elements.map((e: any) => `${e.id}@${e.version}`).sort()).toEqual([
            'missed-by-b@1',
            'shared@3',
        ])

        // The client resends an element that the server lacks and one that the server holds.
        b2.send({ type: 'elements', elements: [el('offline', 1), el('shared', 3)] })
        const relayed = await a.take('elements')
        expect(relayed.elements.map((e: any) => e.id)).toEqual(['offline'])
        expect(await a.expectNone('elements')).toBe(true)
    })

    it('shares one room when two users join an empty board at the same moment', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const [a, b] = await Promise.all([
            TestSocket.connect(apt.id, psychoHeaders),
            TestSocket.connect(apt.id, clientHeaders),
        ])
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [el('e1', 1)] })

        expect((await b.take('elements')).elements[0].id).toBe('e1')
    })

    it('keeps one room when a user closes while another joins the same room load', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        let a!: TestSocket
        let b!: TestSocket
        // The lock holds the room load, so a closes while a and b both wait for it.
        await testDb.begin(async (tx) => {
            await tx`LOCK TABLE whiteboard_files IN ACCESS EXCLUSIVE MODE`
            // a joins first, so its join step runs first when the load ends.
            a = await TestSocket.connect(apt.id, psychoHeaders)
            b = await TestSocket.connect(apt.id, clientHeaders)
            await a.close()
            await Bun.sleep(100)
        })
        await b.syncEmpty()
        const c = await TestSocket.connect(apt.id, psychoHeaders)
        await c.syncEmpty()

        b.send({ type: 'elements', elements: [el('e1', 1)] })

        expect((await c.take('elements')).elements[0].id).toBe('e1')
    })

    it('handles a message that arrives right after the socket opens', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)

        // No wait between open and the first message.
        a.send({ type: 'sync', fileIds: [] })

        expect((await a.take('sync_reply')).type).toBe('sync_reply')
    })

    it('relays cursors with the sender connection id and sends leave on disconnect', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'cursor', x: 10, y: 20 })
        const cursor = await b.take('cursor')
        expect(cursor).toMatchObject({ x: 10, y: 20, userName: expect.any(String) })
        expect(cursor).not.toHaveProperty('userId')
        expect(typeof cursor.connectionId).toBe('string')

        await a.close()
        const leave = await b.take('leave')
        expect(leave.connectionId).toBe(cursor.connectionId)
    })
})

describe('whiteboard WebSocket: files', () => {
    it('relays new files, stores them once, and sends them to a late joiner before the sync reply', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'files', files: { f1: img('f1') } })
        expect(Object.keys((await b.take('files')).files)).toEqual(['f1'])
        // The same id again is not stored or relayed twice.
        a.send({ type: 'files', files: { f1: img('f1') } })
        expect(await b.expectNone('files')).toBe(true)

        await a.close()
        await b.close()
        await waitFor(
            () => readFileIds(apt.id),
            (ids) => ids.length === 1,
        )

        const late = await TestSocket.connect(apt.id, psychoHeaders)
        late.send({ type: 'sync', fileIds: [] })
        const files = await late.take('files')
        expect(Object.keys(files.files)).toEqual(['f1'])
        await late.take('sync_reply')
    })

    it('sends each missing file in its own message', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()
        a.send({ type: 'files', files: { f1: img('f1') } })
        a.send({ type: 'files', files: { f2: img('f2') } })
        await a.expectNone('files', 100)

        const b = await TestSocket.connect(apt.id, psychoHeaders)
        b.send({ type: 'sync', fileIds: [] })

        expect(Object.keys((await b.take('files')).files)).toEqual(['f1'])
        expect(Object.keys((await b.take('files')).files)).toEqual(['f2'])
        await b.take('sync_reply')
    })

    it('asks the client for files that the server lacks', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)

        a.send({ type: 'sync', fileIds: ['only-on-client'] })

        expect((await a.take('sync_reply')).wantFiles).toEqual(['only-on-client'])
    })
})

describe('whiteboard WebSocket: limits', () => {
    it('drops an invalid element and keeps the valid one', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [{ id: 'bad' }, el('good', 1)] })

        expect((await b.take('elements')).elements.map((e: any) => e.id)).toEqual(['good'])
    })

    it('relays a large element without closing', async () => {
        const { apt, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()

        a.send({ type: 'elements', elements: [el('big', 1, 1, { text: 'x'.repeat(7 * 1024 * 1024) })] })

        const relayed = await b.take('elements', 8000)
        expect(relayed.elements.map((e: any) => e.id)).toEqual(['big'])
        expect(a.closeInfo).toBeNull()
    }, 15000)

    it('closes a connection that keeps sending invalid messages', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()

        for (let i = 0; i < 25; i++) a.send({ type: 'nonsense' })

        expect(await a.waitClosed()).toMatchObject({ code: 1008, reason: 'InvalidMessages' })
    })
})

describe('whiteboard WebSocket: rate limit', () => {
    it('closes a connection that sends too many messages in one window', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()

        for (let i = 0; i < MAX_MESSAGES_PER_WINDOW + 50; i++)
            a.send({ type: 'cursor', x: 1, y: 1 })

        expect(await a.waitClosed()).toEqual({ code: 1013, reason: 'RateLimited' })
    })
})

describe('whiteboard WebSocket: saving', () => {
    it('saves elements when the last user leaves', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()
        a.send({
            type: 'elements',
            elements: [el('second', 1, 1, { index: 'a2' }), el('first', 1, 1, { index: 'a1' })],
        })
        await a.expectNone('elements', 100)

        await a.close()

        const saved = await waitFor(
            () => readElements(apt.id),
            (v) => v !== null,
        )
        expect(saved!.map((e) => e.id)).toEqual(['second', 'first'])
    })

    it('loads saved state into a new room', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()
        a.send({ type: 'elements', elements: [el('e1', 4)] })
        await a.expectNone('elements', 100)
        await a.close()
        await waitFor(
            () => readElements(apt.id),
            (v) => v !== null,
        )

        const b = await TestSocket.connect(apt.id, psychoHeaders)
        const reply = await b.syncEmpty()

        expect(reply.elements.map((e: any) => `${e.id}@${e.version}`)).toEqual(['e1@4'])
    })

    it('saves after the delay even when changes never pause', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()

        const started = Date.now()
        let version = 1
        a.send({ type: 'elements', elements: [el('e1', version)] })
        // A change every second must not restart the timer.
        const sender = setInterval(() => {
            version++
            a.send({ type: 'elements', elements: [el('e1', version)] })
        }, 1000)
        try {
            const saved = await waitFor(
                () => readElements(apt.id),
                (v) => v !== null,
                SAVE_DELAY_MS + 1500,
            )
            expect(saved![0].version).toBeGreaterThanOrEqual(1)
            expect(Date.now() - started).toBeLessThan(SAVE_DELAY_MS + 1500)
        } finally {
            clearInterval(sender)
        }
    }, 15000)

    it('keeps work after a failed save and stores it when the last user leaves', async () => {
        const { apt, psychoHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        await a.syncEmpty()

        // A missing files table makes the save fail. The elements must stay unsaved.
        await testDb`ALTER TABLE whiteboard_files RENAME TO whiteboard_files_broken`
        try {
            a.send({ type: 'files', files: { f1: img('f1') } })
            a.send({ type: 'elements', elements: [el('e1', 1)] })
            await Bun.sleep(SAVE_DELAY_MS + 500)
            expect(await readElements(apt.id)).toBeNull()
        } finally {
            await testDb`ALTER TABLE whiteboard_files_broken RENAME TO whiteboard_files`
        }

        await a.close()

        const saved = await waitFor(
            () => readElements(apt.id),
            (v) => v !== null,
        )
        expect(saved!.map((e) => e.id)).toEqual(['e1'])
        expect(await readFileIds(apt.id)).toEqual(['f1'])
    }, 15000)
})

describe('whiteboard WebSocket: appointment end', () => {
    it('closes the sockets and never writes state back after the end', async () => {
        const { apt, psycho, client, psychoHeaders, clientHeaders } = await setupSession()
        const a = await TestSocket.connect(apt.id, psychoHeaders)
        const b = await TestSocket.connect(apt.id, clientHeaders)
        await a.syncEmpty()
        await b.syncEmpty()
        a.send({ type: 'elements', elements: [el('e1', 1)] })
        a.send({ type: 'files', files: { f1: img('f1') } })
        await b.take('files')

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )
        expect(res.status).toBe(200)

        expect(await a.waitClosed()).toEqual({ code: 1000, reason: 'AppointmentEnded' })
        expect(await b.waitClosed()).toEqual({ code: 1000, reason: 'AppointmentEnded' })
        // Wait past the save delay. A pending save must not resurrect the state.
        await Bun.sleep(SAVE_DELAY_MS + 500)
        expect(await readElements(apt.id)).toBeNull()
        expect(await readFileIds(apt.id)).toEqual([])
    }, 15000)
})
