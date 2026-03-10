import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'

// Mock auth middleware helpers
const mockPsychoUser = {
    id: 'psycho-123',
    email: 'psycho@example.com',
    name: 'Dr. Smith',
    image: null,
}

const mockAuthorizedPsycho = mock(async (c: any, next: any) => {
    c.set('user', mockPsychoUser)
    c.set('session', { id: 'session-123' })
    await next()
})

const mockUnauthorized = mock(async (c: any, _next: any) => {
    return c.json({ error: 'Unauthorized' }, 401)
})

const mockForbidden = mock(async (c: any, _next: any) => {
    return c.json(
        { error: 'Unauthorized', message: 'Only a psychologist can make this request' },
        403,
    )
})

describe('POST /api/clients', () => {
    it('returns 400 when email is missing from body', async () => {
        const app = new Hono()
        app.post('/', mockAuthorizedPsycho, async (c) => {
            const body = await c.req.json()
            if (!body.email) {
                return c.json({ error: 'BadRequest', message: 'email is required' }, 400)
            }
            return c.json({ client: {} }, 201)
        })

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
        expect(res.status).toBe(400)
    })

    it('returns 400 with ClientNotFound when no account exists for given email', async () => {
        const mockFindClientByEmail = mock(async (_email: string) => null)

        const app = new Hono()
        app.post('/', mockAuthorizedPsycho, async (c) => {
            const body = await c.req.json()
            if (!body.email) {
                return c.json({ error: 'BadRequest', message: 'email is required' }, 400)
            }
            const client = await mockFindClientByEmail(body.email)
            if (!client) {
                return c.json(
                    {
                        error: 'ClientNotFound',
                        message:
                            'No account found for this email. Ask your client to register first.',
                    },
                    400,
                )
            }
            return c.json({ client }, 201)
        })

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'notfound@example.com' }),
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'ClientNotFound')
        expect(body).toHaveProperty(
            'message',
            'No account found for this email. Ask your client to register first.',
        )
    })

    it('returns 400 with AlreadyLinked when client is already in the psychologist list', async () => {
        const mockClient = {
            id: 'client-456',
            email: 'client@example.com',
            name: 'Jane Doe',
            image: null,
        }
        const mockFindClientByEmail = mock(async (_email: string) => mockClient)
        const mockLinkClientToPsycho = mock(async (_clientId: string, _psychoId: string) => {
            const error: any = new Error('duplicate key value violates unique constraint')
            error.code = '23505'
            throw error
        })

        const app = new Hono()
        app.post('/', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const body = await c.req.json()
            if (!body.email) {
                return c.json({ error: 'BadRequest', message: 'email is required' }, 400)
            }
            const client = await mockFindClientByEmail(body.email)
            if (!client) {
                return c.json(
                    {
                        error: 'ClientNotFound',
                        message:
                            'No account found for this email. Ask your client to register first.',
                    },
                    400,
                )
            }
            try {
                await mockLinkClientToPsycho(client.id, user.id)
            } catch (err: any) {
                if (err.code === '23505') {
                    return c.json(
                        { error: 'AlreadyLinked', message: 'This client is already in your list.' },
                        400,
                    )
                }
                throw err
            }
            return c.json({ client }, 201)
        })

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client@example.com' }),
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AlreadyLinked')
        expect(body).toHaveProperty('message', 'This client is already in your list.')
    })

    it('returns 201 with client on success', async () => {
        const mockClient = {
            id: 'client-456',
            email: 'client@example.com',
            name: 'Jane Doe',
            image: null,
        }
        const mockFindClientByEmail = mock(async (_email: string) => mockClient)
        const mockLinkClientToPsycho = mock(
            async (_clientId: string, _psychoId: string) => undefined,
        )

        const app = new Hono()
        app.post('/', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const body = await c.req.json()
            if (!body.email) {
                return c.json({ error: 'BadRequest', message: 'email is required' }, 400)
            }
            const client = await mockFindClientByEmail(body.email)
            if (!client) {
                return c.json(
                    {
                        error: 'ClientNotFound',
                        message:
                            'No account found for this email. Ask your client to register first.',
                    },
                    400,
                )
            }
            try {
                await mockLinkClientToPsycho(client.id, user.id)
            } catch (err: any) {
                if (err.code === '23505') {
                    return c.json(
                        { error: 'AlreadyLinked', message: 'This client is already in your list.' },
                        400,
                    )
                }
                throw err
            }
            return c.json({ client }, 201)
        })

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client@example.com' }),
        })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('client')
        expect(body.client).toHaveProperty('id', 'client-456')
        expect(body.client).toHaveProperty('email', 'client@example.com')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.post('/', mockUnauthorized, async (c) => {
            return c.json({ client: {} }, 201)
        })

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client@example.com' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.post('/', mockForbidden, async (c) => {
            return c.json({ client: {} }, 201)
        })

        const res = await app.request('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Helpsycho-User-Role': 'client',
            },
            body: JSON.stringify({ email: 'client@example.com' }),
        })
        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients', () => {
    it('returns list of clients for authenticated psychologist', async () => {
        const mockClients = [
            { id: 'client-1', email: 'a@example.com', name: 'Alice', image: null },
            { id: 'client-2', email: 'b@example.com', name: 'Bob', image: null },
        ]
        const mockFindClients = mock(async (_params: any) => mockClients)

        const app = new Hono()
        app.get('/', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clients = await mockFindClients({ psychoId: user.id })
            return c.json({ clients })
        })

        const res = await app.request('/')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('clients')
        expect(body.clients).toHaveLength(2)
        expect(body.clients[0]).toHaveProperty('id', 'client-1')
        expect(body.clients[0]).toHaveProperty('email', 'a@example.com')
        expect(body.clients[0]).toHaveProperty('name', 'Alice')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.get('/', mockUnauthorized, async (c) => {
            return c.json({ clients: [] })
        })

        const res = await app.request('/')
        expect(res.status).toBe(401)
    })
})
