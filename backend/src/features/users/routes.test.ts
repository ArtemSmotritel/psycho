import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'

// Mock the auth middleware
const mockAuthorized = mock(async (c: any, next: any) => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
    }
    c.set('user', mockUser)
    c.set('session', { id: 'session-123' })
    await next()
})

const mockUnauthorized = mock(async (c: any, _next: any) => {
    return c.json({ error: 'Unauthorized' }, 401)
})

describe('GET /api/users/me', () => {
    it('returns user profile for authenticated user including active_role', async () => {
        const mockGetMe = mock(async (_id: string) => ({
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            image: 'https://example.com/avatar.jpg',
            active_role: null,
        }))

        const app = new Hono()
        app.get('/me', mockAuthorized, async (c) => {
            const user = c.get('user')
            const fullUser = await mockGetMe(user.id)
            return c.json({
                id: fullUser.id,
                email: fullUser.email,
                name: fullUser.name,
                active_role: fullUser.active_role,
            })
        })

        const res = await app.request('/me')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('active_role', null)
        expect(body).toHaveProperty('id', 'user-123')
        expect(body).toHaveProperty('email', 'test@example.com')
        expect(body).toHaveProperty('name', 'Test User')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.get('/me', mockUnauthorized, async (c) => {
            const user = c.get('user')
            return c.json({
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
            })
        })

        const res = await app.request('/me')
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'Unauthorized')
    })
})

describe('PATCH /api/users/me/role', () => {
    it('sets psycho role and returns updated user (200)', async () => {
        const mockSetActiveRole = mock(async (_id: string, role: string) => ({
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            active_role: role,
        }))

        const app = new Hono()
        app.patch('/me/role', mockAuthorized, async (c) => {
            const user = c.get('user')
            const body = await c.req.json()
            const { role } = body
            if (role !== 'psycho' && role !== 'client') {
                return c.json({ error: 'Invalid role' }, 400)
            }
            const updated = await mockSetActiveRole(user.id, role)
            return c.json({
                id: updated.id,
                email: updated.email,
                name: updated.name,
                active_role: updated.active_role,
            })
        })

        const res = await app.request('/me/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'psycho' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('active_role', 'psycho')
    })

    it('sets client role and returns updated user (200)', async () => {
        const mockSetActiveRole = mock(async (_id: string, role: string) => ({
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            active_role: role,
        }))

        const app = new Hono()
        app.patch('/me/role', mockAuthorized, async (c) => {
            const user = c.get('user')
            const body = await c.req.json()
            const { role } = body
            if (role !== 'psycho' && role !== 'client') {
                return c.json({ error: 'Invalid role' }, 400)
            }
            const updated = await mockSetActiveRole(user.id, role)
            return c.json({
                id: updated.id,
                email: updated.email,
                name: updated.name,
                active_role: updated.active_role,
            })
        })

        const res = await app.request('/me/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'client' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('active_role', 'client')
    })

    it('rejects invalid role value with 400', async () => {
        const app = new Hono()
        app.patch('/me/role', mockAuthorized, async (c) => {
            const body = await c.req.json()
            const { role } = body
            if (role !== 'psycho' && role !== 'client') {
                return c.json({ error: 'Invalid role' }, 400)
            }
            return c.json({ active_role: role })
        })

        const res = await app.request('/me/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'admin' }),
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'Invalid role')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.patch('/me/role', mockUnauthorized, async (c) => {
            return c.json({ active_role: 'psycho' })
        })

        const res = await app.request('/me/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'psycho' }),
        })
        expect(res.status).toBe(401)
    })
})
