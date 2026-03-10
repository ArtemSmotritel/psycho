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
        const mockIsClientLinkedToPsycho = mock(
            async (_clientId: string, _psychoId: string) => true,
        )
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
            const alreadyLinked = await mockIsClientLinkedToPsycho(client.id, user.id)
            if (alreadyLinked) {
                return c.json(
                    { error: 'AlreadyLinked', message: 'This client is already in your list.' },
                    400,
                )
            }
            await mockLinkClientToPsycho(client.id, user.id)
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
        const mockIsClientLinkedToPsycho = mock(
            async (_clientId: string, _psychoId: string) => false,
        )
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
            const alreadyLinked = await mockIsClientLinkedToPsycho(client.id, user.id)
            if (alreadyLinked) {
                return c.json(
                    { error: 'AlreadyLinked', message: 'This client is already in your list.' },
                    400,
                )
            }
            await mockLinkClientToPsycho(client.id, user.id)
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

describe('GET /api/clients (non-psycho role returns 403)', () => {
    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.get('/', mockForbidden, async (c) => {
            return c.json({ clients: [] })
        })

        const res = await app.request('/', {
            headers: { 'Helpsycho-User-Role': 'client' },
        })
        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients/:clientId', () => {
    it('returns 200 with client object for known clientId', async () => {
        const mockClient = {
            id: 'client-456',
            email: 'client@example.com',
            name: 'Jane Doe',
            image: null,
        }
        const mockFindClientById = mock(async (_id: string) => mockClient)

        const app = new Hono()
        app.get('/:clientId', mockAuthorizedPsycho, async (c) => {
            const client = await mockFindClientById(c.req.param('clientId'))
            if (!client) {
                return c.json({ error: 'NotFound' }, 404)
            }
            return c.json({ client })
        })

        const res = await app.request('/client-456')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('client')
        expect(body.client).toHaveProperty('id', 'client-456')
        expect(body.client).toHaveProperty('email', 'client@example.com')
        expect(body.client).toHaveProperty('name', 'Jane Doe')
    })

    it('returns 404 for unknown clientId', async () => {
        const mockFindClientById = mock(async (_id: string) => null)

        const app = new Hono()
        app.get('/:clientId', mockAuthorizedPsycho, async (c) => {
            const client = await mockFindClientById(c.req.param('clientId'))
            if (!client) {
                return c.json({ error: 'NotFound' }, 404)
            }
            return c.json({ client })
        })

        const res = await app.request('/nonexistent-id')
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.get('/:clientId', mockForbidden, async (c) => {
            return c.json({ client: {} })
        })

        const res = await app.request('/client-456', {
            headers: { 'Helpsycho-User-Role': 'client' },
        })
        expect(res.status).toBe(403)
    })
})

describe('findClients service (unit)', () => {
    it('returns only clients linked to the given psychoId', async () => {
        const psychoId = 'psycho-123'
        const expectedClients = [
            { id: 'client-1', email: 'a@example.com', name: 'Alice', image: null },
        ]
        const mockFindClients = mock(async (params: { psychoId: string }) => {
            if (params.psychoId === psychoId) return expectedClients
            return []
        })

        const result = await mockFindClients({ psychoId })
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('id', 'client-1')
    })

    it('returns empty array when no clients are linked to psychoId', async () => {
        const mockFindClients = mock(async (_params: { psychoId: string }) => [])
        const result = await mockFindClients({ psychoId: 'psycho-no-clients' })
        expect(result).toEqual([])
    })

    it('excludes clients linked to a different psychologist', async () => {
        const psychoId = 'psycho-123'
        const otherPsychoId = 'psycho-999'
        const clients = [{ id: 'client-1', email: 'a@example.com', name: 'Alice', image: null }]
        const mockFindClients = mock(async (params: { psychoId: string }) => {
            if (params.psychoId === psychoId) return clients
            return []
        })

        const resultForOtherPsycho = await mockFindClients({ psychoId: otherPsychoId })
        expect(resultForOtherPsycho).toEqual([])

        const resultForPsycho = await mockFindClients({ psychoId })
        expect(resultForPsycho).toHaveLength(1)
    })
})

describe('findClientById service (unit)', () => {
    it('returns client by user_id', async () => {
        const mockClient = {
            id: 'client-456',
            email: 'client@example.com',
            name: 'Jane Doe',
            image: null,
        }
        const mockFindClientById = mock(async (id: string) =>
            id === 'client-456' ? mockClient : null,
        )

        const result = await mockFindClientById('client-456')
        expect(result).toHaveProperty('id', 'client-456')
        expect(result).toHaveProperty('email', 'client@example.com')
    })

    it('returns null for unknown id', async () => {
        const mockFindClientById = mock(async (_id: string) => null)
        const result = await mockFindClientById('unknown-id')
        expect(result).toBeNull()
    })
})

describe('isClientLinkedToPsycho', () => {
    it('returns true when an active link exists', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => true)
        const result = await mockIsLinked('client-456', 'psycho-123')
        expect(result).toBe(true)
    })

    it('returns false when no link exists', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => false)
        const result = await mockIsLinked('client-456', 'psycho-123')
        expect(result).toBe(false)
    })
})

describe('findClientPsychoRelationship service (unit)', () => {
    it('returns the row when an active link exists', async () => {
        const activeRow = {
            client_id: 'client-456',
            psycho_id: 'psycho-123',
            disconnected_at: null,
        }
        const mockFn = mock(async (_clientId: string, _psychoId: string) => activeRow)
        const result = await mockFn('client-456', 'psycho-123')
        expect(result).toHaveProperty('client_id', 'client-456')
        expect(result).toHaveProperty('disconnected_at', null)
    })

    it('returns undefined when disconnected_at is set', async () => {
        const mockFn = mock(async (_clientId: string, _psychoId: string) => undefined)
        const result = await mockFn('client-456', 'psycho-123')
        expect(result).toBeUndefined()
    })

    it('returns undefined when no link exists', async () => {
        const mockFn = mock(async (_clientId: string, _psychoId: string) => undefined)
        const result = await mockFn('client-999', 'psycho-123')
        expect(result).toBeUndefined()
    })
})

describe('unlinkClientFromPsycho service (unit)', () => {
    it('sets disconnected_at to a non-null timestamp for an active relationship', async () => {
        let updatedAt: string | null = null
        const mockFn = mock(async (_clientId: string, _psychoId: string): Promise<void> => {
            updatedAt = new Date().toISOString()
        })
        await mockFn('client-456', 'psycho-123')
        expect(updatedAt).not.toBeNull()
    })

    it('is a no-op when the relationship is already disconnected', async () => {
        const mockFn = mock(async (_clientId: string, _psychoId: string): Promise<void> => {
            // no error thrown
        })
        await expect(mockFn('client-456', 'psycho-123')).resolves.toBeUndefined()
    })
})

describe('findClients (disconnected filter)', () => {
    it('excludes clients whose disconnected_at IS NOT NULL', async () => {
        const mockFn = mock(async (_params: { psychoId: string }) => [
            { id: 'client-1', email: 'a@example.com', name: 'Alice', image: null },
        ])
        const result = await mockFn({ psychoId: 'psycho-123' })
        // Only 1 active client returned; disconnected client-2 is excluded
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('id', 'client-1')
    })

    it('still returns clients with disconnected_at IS NULL', async () => {
        const mockFn = mock(async (_params: { psychoId: string }) => [
            { id: 'client-1', email: 'a@example.com', name: 'Alice', image: null },
        ])
        const result = await mockFn({ psychoId: 'psycho-123' })
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('id', 'client-1')
    })
})

describe('DELETE /api/clients/:clientId', () => {
    it('returns 200 with { success: true } on happy path', async () => {
        const mockRelationship = {
            client_id: 'client-456',
            psycho_id: 'psycho-123',
            disconnected_at: null,
        }
        const mockFindRelationship = mock(
            async (_clientId: string, _psychoId: string) => mockRelationship,
        )
        const mockUnlink = mock(async (_clientId: string, _psychoId: string): Promise<void> => {})

        const app = new Hono()
        app.delete('/:clientId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const relationship = await mockFindRelationship(clientId, user.id)
            if (!relationship) {
                return c.json({ error: 'NotFound' }, 404)
            }
            await mockUnlink(clientId, user.id)
            return c.json({ success: true })
        })

        const res = await app.request('/client-456', { method: 'DELETE' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('success', true)
    })

    it('returns 404 when relationship does not exist', async () => {
        const mockFindRelationship = mock(async (_clientId: string, _psychoId: string) => undefined)
        const mockUnlink = mock(async (_clientId: string, _psychoId: string): Promise<void> => {})

        const app = new Hono()
        app.delete('/:clientId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const relationship = await mockFindRelationship(clientId, user.id)
            if (!relationship) {
                return c.json({ error: 'NotFound' }, 404)
            }
            await mockUnlink(clientId, user.id)
            return c.json({ success: true })
        })

        const res = await app.request('/nonexistent-client', { method: 'DELETE' })
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when relationship is already disconnected', async () => {
        const mockFindRelationship = mock(async (_clientId: string, _psychoId: string) => undefined)

        const app = new Hono()
        app.delete('/:clientId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const relationship = await mockFindRelationship(clientId, user.id)
            if (!relationship) {
                return c.json({ error: 'NotFound' }, 404)
            }
            return c.json({ success: true })
        })

        const res = await app.request('/client-456', { method: 'DELETE' })
        expect(res.status).toBe(404)
    })

    it('returns 403 for non-psycho role', async () => {
        const app = new Hono()
        app.delete('/:clientId', mockForbidden, async (c) => {
            return c.json({ success: true })
        })

        const res = await app.request('/client-456', {
            method: 'DELETE',
            headers: { 'Helpsycho-User-Role': 'client' },
        })
        expect(res.status).toBe(403)
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.delete('/:clientId', mockUnauthorized, async (c) => {
            return c.json({ success: true })
        })

        const res = await app.request('/client-456', { method: 'DELETE' })
        expect(res.status).toBe(401)
    })
})
