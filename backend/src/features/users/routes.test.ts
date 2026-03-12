import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'

describe('GET /api/users/me', () => {
    it('returns user profile for authenticated user including active_role', async () => {
        const user = await insertTestUser({ email: 'alice@test.com', name: 'Alice' })

        const res = await app.request('/api/users/me', await asUser(user.id))

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('active_role', null)
        expect(body).toHaveProperty('id', user.id)
        expect(body).toHaveProperty('email', 'alice@test.com')
        expect(body).toHaveProperty('name', 'Alice')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/users/me')
        expect(res.status).toBe(401)
    })
})

describe('PATCH /api/users/me/role', () => {
    it('sets psycho role and returns updated user (200)', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/users/me/role',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'psycho' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('active_role', 'psycho')
    })

    it('sets client role and returns updated user (200)', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/users/me/role',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'client' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('active_role', 'client')
    })

    it('rejects invalid role value with 400', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/users/me/role',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'Invalid role')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/users/me/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'psycho' }),
        })
        expect(res.status).toBe(401)
    })
})
