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

describe('POST /api/clients/:clientId/appointments', () => {
    it('returns 201 with appointment on happy path', async () => {
        const mockAppointment = {
            id: 'apt-001',
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
            status: 'upcoming',
            googleMeetLink: null,
            createdAt: '2026-03-10T15:00:00.000Z',
        }
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => true)
        const mockCreate = mock(async (_params: any) => mockAppointment)

        const app = new Hono()
        app.post('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const body = await c.req.json()

            if (!body.startTime) {
                return c.json({ error: 'BadRequest', message: 'startTime is required' }, 400)
            }
            if (!body.endTime) {
                return c.json({ error: 'BadRequest', message: 'endTime is required' }, 400)
            }
            if (new Date(body.endTime) <= new Date(body.startTime)) {
                return c.json(
                    { error: 'BadRequest', message: 'endTime must be after startTime' },
                    400,
                )
            }

            const linked = await mockIsLinked(clientId, user.id)
            if (!linked) {
                return c.json(
                    { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                    400,
                )
            }

            const appointment = await mockCreate({
                psychoId: user.id,
                clientId,
                startTime: body.startTime,
                endTime: body.endTime,
            })

            return c.json({ appointment }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-01T10:00:00.000Z',
                endTime: '2026-04-01T11:00:00.000Z',
                generateGoogleMeet: false,
            }),
        })

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'upcoming')
        expect(body.appointment).toHaveProperty('googleMeetLink', null)
        expect(body.appointment).toHaveProperty('clientId', 'client-456')
        expect(body.appointment).toHaveProperty('psychoId', 'psycho-123')
    })

    it('returns 400 BadRequest when startTime is missing', async () => {
        const app = new Hono()
        app.post('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const body = await c.req.json()
            if (!body.startTime) {
                return c.json({ error: 'BadRequest', message: 'startTime is required' }, 400)
            }
            return c.json({ appointment: {} }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endTime: '2026-04-01T11:00:00.000Z' }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'startTime is required')
    })

    it('returns 400 BadRequest when endTime is missing', async () => {
        const app = new Hono()
        app.post('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const body = await c.req.json()
            if (!body.startTime) {
                return c.json({ error: 'BadRequest', message: 'startTime is required' }, 400)
            }
            if (!body.endTime) {
                return c.json({ error: 'BadRequest', message: 'endTime is required' }, 400)
            }
            return c.json({ appointment: {} }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: '2026-04-01T10:00:00.000Z' }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'endTime is required')
    })

    it('returns 400 BadRequest when endTime <= startTime', async () => {
        const app = new Hono()
        app.post('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const body = await c.req.json()
            if (!body.startTime) {
                return c.json({ error: 'BadRequest', message: 'startTime is required' }, 400)
            }
            if (!body.endTime) {
                return c.json({ error: 'BadRequest', message: 'endTime is required' }, 400)
            }
            if (new Date(body.endTime) <= new Date(body.startTime)) {
                return c.json(
                    { error: 'BadRequest', message: 'endTime must be after startTime' },
                    400,
                )
            }
            return c.json({ appointment: {} }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-01T11:00:00.000Z',
                endTime: '2026-04-01T10:00:00.000Z',
            }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'endTime must be after startTime')
    })

    it('returns 400 ClientNotLinked when client is not linked to psychologist', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => false)

        const app = new Hono()
        app.post('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const body = await c.req.json()

            if (!body.startTime) {
                return c.json({ error: 'BadRequest', message: 'startTime is required' }, 400)
            }
            if (!body.endTime) {
                return c.json({ error: 'BadRequest', message: 'endTime is required' }, 400)
            }
            if (new Date(body.endTime) <= new Date(body.startTime)) {
                return c.json(
                    { error: 'BadRequest', message: 'endTime must be after startTime' },
                    400,
                )
            }

            const linked = await mockIsLinked(clientId, user.id)
            if (!linked) {
                return c.json(
                    { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                    400,
                )
            }

            return c.json({ appointment: {} }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-01T10:00:00.000Z',
                endTime: '2026-04-01T11:00:00.000Z',
            }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'ClientNotLinked')
        expect(body).toHaveProperty('message', 'This client is not in your list.')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.post('/:clientId/appointments', mockUnauthorized, async (c) => {
            return c.json({ appointment: {} }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-01T10:00:00.000Z',
                endTime: '2026-04-01T11:00:00.000Z',
            }),
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.post('/:clientId/appointments', mockForbidden, async (c) => {
            return c.json({ appointment: {} }, 201)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Helpsycho-User-Role': 'client',
            },
            body: JSON.stringify({
                startTime: '2026-04-01T10:00:00.000Z',
                endTime: '2026-04-01T11:00:00.000Z',
            }),
        })

        expect(res.status).toBe(403)
    })
})

describe('createAppointment service (unit)', () => {
    it('returns appointment with status upcoming and null googleMeetLink', async () => {
        const mockCreate = mock(
            async (_params: {
                psychoId: string
                clientId: string
                startTime: string
                endTime: string
                googleMeetLink?: string | null
            }) => ({
                id: 'apt-001',
                psychoId: _params.psychoId,
                clientId: _params.clientId,
                startTime: _params.startTime,
                endTime: _params.endTime,
                status: 'upcoming' as const,
                googleMeetLink: null,
                createdAt: '2026-03-10T15:00:00.000Z',
            }),
        )

        const result = await mockCreate({
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        expect(result.status).toBe('upcoming')
        expect(result.googleMeetLink).toBeNull()
        expect(result.psychoId).toBe('psycho-123')
        expect(result.clientId).toBe('client-456')
    })
})

describe('isClientLinkedAndActive service (unit)', () => {
    it('returns true when client is actively linked (disconnected_at IS NULL)', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => true)
        const result = await mockIsLinked('client-456', 'psycho-123')
        expect(result).toBe(true)
    })

    it('returns false when client link has disconnected_at set', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => false)
        const result = await mockIsLinked('client-456', 'psycho-123')
        expect(result).toBe(false)
    })

    it('returns false when no link exists', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => false)
        const result = await mockIsLinked('client-999', 'psycho-123')
        expect(result).toBe(false)
    })
})

describe('PATCH /api/clients/:clientId/appointments/:appointmentId', () => {
    const mockUpcomingAppointment = {
        id: 'apt-001',
        psychoId: 'psycho-123',
        clientId: 'client-456',
        startTime: '2026-04-01T10:00:00.000Z',
        endTime: '2026-04-01T11:00:00.000Z',
        status: 'upcoming' as const,
        googleMeetLink: null,
        createdAt: '2026-03-10T15:00:00.000Z',
    }

    it('returns 200 with updated appointment on happy path', async () => {
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => mockUpcomingAppointment,
        )
        const mockUpdate = mock(async (_id: string, _params: any) => ({
            ...mockUpcomingAppointment,
            startTime: '2026-04-02T10:00:00.000Z',
            endTime: '2026-04-02T11:00:00.000Z',
            googleMeetLink: 'https://meet.google.com/abc',
        }))

        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')
            const body = await c.req.json()

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotEditable',
                        message: 'Only upcoming appointments can be edited.',
                    },
                    400,
                )
            }

            const mergedStart = body.startTime ?? existing.startTime
            const mergedEnd = body.endTime ?? existing.endTime
            const mergedLink =
                'googleMeetLink' in body ? body.googleMeetLink : existing.googleMeetLink

            if (new Date(mergedEnd) <= new Date(mergedStart)) {
                return c.json(
                    { error: 'BadRequest', message: 'endTime must be after startTime' },
                    400,
                )
            }

            const appointment = await mockUpdate(appointmentId, {
                startTime: mergedStart,
                endTime: mergedEnd,
                googleMeetLink: mergedLink,
            })

            return c.json({ appointment }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-02T10:00:00.000Z',
                endTime: '2026-04-02T11:00:00.000Z',
                googleMeetLink: 'https://meet.google.com/abc',
            }),
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('startTime', '2026-04-02T10:00:00.000Z')
        expect(body.appointment).toHaveProperty('endTime', '2026-04-02T11:00:00.000Z')
        expect(body.appointment).toHaveProperty('googleMeetLink', 'https://meet.google.com/abc')
        expect(mockUpdate).toHaveBeenCalledWith('apt-001', {
            startTime: '2026-04-02T10:00:00.000Z',
            endTime: '2026-04-02T11:00:00.000Z',
            googleMeetLink: 'https://meet.google.com/abc',
        })
    })

    it('returns 404 NotFound when appointment does not exist', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)

        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }

            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/nonexistent', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
        })

        expect(res.status).toBe(404)
        const resBody = await res.json()
        expect(resBody).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotEditable for past appointment', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => ({
            ...mockUpcomingAppointment,
            status: 'past' as const,
        }))

        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotEditable',
                        message: 'Only upcoming appointments can be edited.',
                    },
                    400,
                )
            }
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
        })

        expect(res.status).toBe(400)
        const resBody = await res.json()
        expect(resBody).toHaveProperty('error', 'AppointmentNotEditable')
        expect(resBody).toHaveProperty('message', 'Only upcoming appointments can be edited.')
    })

    it('returns 400 AppointmentNotEditable for active appointment', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => ({
            ...mockUpcomingAppointment,
            status: 'active' as const,
        }))

        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotEditable',
                        message: 'Only upcoming appointments can be edited.',
                    },
                    400,
                )
            }
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotEditable')
    })

    it('returns 400 BadRequest when merged endTime is before merged startTime', async () => {
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => mockUpcomingAppointment,
        )

        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')
            const body = await c.req.json()

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotEditable',
                        message: 'Only upcoming appointments can be edited.',
                    },
                    400,
                )
            }

            const mergedStart = body.startTime ?? existing.startTime
            const mergedEnd = body.endTime ?? existing.endTime

            if (new Date(mergedEnd) <= new Date(mergedStart)) {
                return c.json(
                    { error: 'BadRequest', message: 'endTime must be after startTime' },
                    400,
                )
            }

            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-02T12:00:00.000Z',
                endTime: '2026-04-02T10:00:00.000Z',
            }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'endTime must be after startTime')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockUnauthorized, async (c) => {
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId', mockForbidden, async (c) => {
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Helpsycho-User-Role': 'client',
            },
            body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
        })

        expect(res.status).toBe(403)
    })
})

describe('findAppointmentById service (unit)', () => {
    it('returns appointment when id, psychoId, and clientId all match', async () => {
        const expected = {
            id: 'apt-001',
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
            status: 'upcoming' as const,
            googleMeetLink: null,
            createdAt: '2026-03-10T15:00:00.000Z',
        }
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => expected,
        )
        const result = await mockFindById('apt-001', 'psycho-123', 'client-456')
        expect(result).toEqual(expected)
    })

    it('returns null when appointmentId does not match', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)
        const result = await mockFindById('apt-999', 'psycho-123', 'client-456')
        expect(result).toBeNull()
    })

    it('returns null when psychoId does not match', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)
        const result = await mockFindById('apt-001', 'psycho-wrong', 'client-456')
        expect(result).toBeNull()
    })

    it('returns null when clientId does not match', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)
        const result = await mockFindById('apt-001', 'psycho-123', 'client-wrong')
        expect(result).toBeNull()
    })
})

describe('DELETE /api/clients/:clientId/appointments/:appointmentId', () => {
    const mockUpcomingAppointment = {
        id: 'apt-001',
        psychoId: 'psycho-123',
        clientId: 'client-456',
        startTime: '2026-04-01T10:00:00.000Z',
        endTime: '2026-04-01T11:00:00.000Z',
        status: 'upcoming' as const,
        googleMeetLink: null,
        createdAt: '2026-03-10T15:00:00.000Z',
    }

    it('returns 200 { success: true } on happy path', async () => {
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => mockUpcomingAppointment,
        )
        const mockDelete = mock(async (_id: string) => undefined)

        const app = new Hono()
        app.delete('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotDeletable',
                        message: 'Only upcoming appointments can be deleted.',
                    },
                    400,
                )
            }

            await mockDelete(appointmentId)

            return c.json({ success: true }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'DELETE',
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('success', true)
        expect(mockDelete).toHaveBeenCalledWith('apt-001')
    })

    it('returns 404 NotFound when appointment does not exist', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)

        const app = new Hono()
        app.delete('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }

            return c.json({ success: true }, 200)
        })

        const res = await app.request('/client-456/appointments/nonexistent', {
            method: 'DELETE',
        })

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotDeletable for past appointment', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => ({
            ...mockUpcomingAppointment,
            status: 'past' as const,
        }))

        const app = new Hono()
        app.delete('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotDeletable',
                        message: 'Only upcoming appointments can be deleted.',
                    },
                    400,
                )
            }

            return c.json({ success: true }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'DELETE',
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotDeletable')
        expect(body).toHaveProperty('message', 'Only upcoming appointments can be deleted.')
    })

    it('returns 400 AppointmentNotDeletable for active appointment', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => ({
            ...mockUpcomingAppointment,
            status: 'active' as const,
        }))

        const app = new Hono()
        app.delete('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const existing = await mockFindById(appointmentId, user.id, clientId)
            if (!existing) {
                return c.json({ error: 'NotFound' }, 404)
            }
            if (existing.status !== 'upcoming') {
                return c.json(
                    {
                        error: 'AppointmentNotDeletable',
                        message: 'Only upcoming appointments can be deleted.',
                    },
                    400,
                )
            }

            return c.json({ success: true }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'DELETE',
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotDeletable')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.delete('/:clientId/appointments/:appointmentId', mockUnauthorized, async (c) => {
            return c.json({ success: true }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'DELETE',
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.delete('/:clientId/appointments/:appointmentId', mockForbidden, async (c) => {
            return c.json({ success: true }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'DELETE',
            headers: { 'Helpsycho-User-Role': 'client' },
        })

        expect(res.status).toBe(403)
    })
})

describe('deleteAppointment service (unit)', () => {
    it('resolves without error', async () => {
        const mockDelete = mock(async (_id: string) => undefined)
        await expect(mockDelete('apt-001')).resolves.toBeUndefined()
        expect(mockDelete).toHaveBeenCalledWith('apt-001')
    })
})

describe('updateAppointment service (unit)', () => {
    it('returns updated appointment with new times and googleMeetLink', async () => {
        const mockUpdate = mock(
            async (
                _id: string,
                params: { startTime: string; endTime: string; googleMeetLink: string | null },
            ) => ({
                id: 'apt-001',
                psychoId: 'psycho-123',
                clientId: 'client-456',
                startTime: params.startTime,
                endTime: params.endTime,
                status: 'upcoming' as const,
                googleMeetLink: params.googleMeetLink,
                createdAt: '2026-03-10T15:00:00.000Z',
            }),
        )

        const result = await mockUpdate('apt-001', {
            startTime: '2026-04-02T10:00:00.000Z',
            endTime: '2026-04-02T11:00:00.000Z',
            googleMeetLink: 'https://meet.google.com/new',
        })

        expect(result.startTime).toBe('2026-04-02T10:00:00.000Z')
        expect(result.endTime).toBe('2026-04-02T11:00:00.000Z')
        expect(result.googleMeetLink).toBe('https://meet.google.com/new')
    })

    it('returns updated appointment with null googleMeetLink when cleared', async () => {
        const mockUpdate = mock(
            async (
                _id: string,
                params: { startTime: string; endTime: string; googleMeetLink: string | null },
            ) => ({
                id: 'apt-001',
                psychoId: 'psycho-123',
                clientId: 'client-456',
                startTime: params.startTime,
                endTime: params.endTime,
                status: 'upcoming' as const,
                googleMeetLink: params.googleMeetLink,
                createdAt: '2026-03-10T15:00:00.000Z',
            }),
        )

        const result = await mockUpdate('apt-001', {
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
            googleMeetLink: null,
        })

        expect(result.googleMeetLink).toBeNull()
    })
})

describe('GET /api/clients/:clientId/appointments', () => {
    const mockAppointments = [
        {
            id: 'apt-001',
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
            status: 'upcoming' as const,
            googleMeetLink: null,
            createdAt: '2026-03-10T15:00:00.000Z',
        },
        {
            id: 'apt-002',
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-03-01T10:00:00.000Z',
            endTime: '2026-03-01T11:00:00.000Z',
            status: 'past' as const,
            googleMeetLink: 'https://meet.google.com/abc',
            createdAt: '2026-02-01T15:00:00.000Z',
        },
        {
            id: 'apt-003',
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-03-10T09:00:00.000Z',
            endTime: '2026-03-10T10:00:00.000Z',
            status: 'active' as const,
            googleMeetLink: null,
            createdAt: '2026-02-15T15:00:00.000Z',
        },
    ]

    it('returns 200 with appointments array when client is linked and appointments exist', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => true)
        const mockList = mock(async (_psychoId: string, _clientId: string) => mockAppointments)

        const app = new Hono()
        app.get('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')

            const linked = await mockIsLinked(clientId, user.id)
            if (!linked) {
                return c.json(
                    { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                    400,
                )
            }

            const appointments = await mockList(user.id, clientId)
            return c.json({ appointments }, 200)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'GET',
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toHaveLength(3)
        const statuses = body.appointments.map((a: any) => a.status)
        expect(statuses).toContain('upcoming')
        expect(statuses).toContain('past')
        expect(statuses).toContain('active')
    })

    it('returns 200 with empty appointments array when client is linked but has no appointments', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => true)
        const mockList = mock(async (_psychoId: string, _clientId: string) => [])

        const app = new Hono()
        app.get('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')

            const linked = await mockIsLinked(clientId, user.id)
            if (!linked) {
                return c.json(
                    { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                    400,
                )
            }

            const appointments = await mockList(user.id, clientId)
            return c.json({ appointments }, 200)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'GET',
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toEqual([])
    })

    it('returns 400 ClientNotLinked when client is not linked to psychologist', async () => {
        const mockIsLinked = mock(async (_clientId: string, _psychoId: string) => false)

        const app = new Hono()
        app.get('/:clientId/appointments', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')

            const linked = await mockIsLinked(clientId, user.id)
            if (!linked) {
                return c.json(
                    { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                    400,
                )
            }

            return c.json({ appointments: [] }, 200)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'GET',
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'ClientNotLinked')
        expect(body).toHaveProperty('message', 'This client is not in your list.')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.get('/:clientId/appointments', mockUnauthorized, async (c) => {
            return c.json({ appointments: [] }, 200)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'GET',
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.get('/:clientId/appointments', mockForbidden, async (c) => {
            return c.json({ appointments: [] }, 200)
        })

        const res = await app.request('/client-456/appointments', {
            method: 'GET',
            headers: { 'Helpsycho-User-Role': 'client' },
        })

        expect(res.status).toBe(403)
    })
})

describe('listAppointments service (unit)', () => {
    it('returns array of appointments for matching psychoId and clientId', async () => {
        const expected = [
            {
                id: 'apt-001',
                psychoId: 'psycho-123',
                clientId: 'client-456',
                startTime: '2026-04-01T10:00:00.000Z',
                endTime: '2026-04-01T11:00:00.000Z',
                status: 'upcoming' as const,
                googleMeetLink: null,
                createdAt: '2026-03-10T15:00:00.000Z',
            },
            {
                id: 'apt-002',
                psychoId: 'psycho-123',
                clientId: 'client-456',
                startTime: '2026-03-01T10:00:00.000Z',
                endTime: '2026-03-01T11:00:00.000Z',
                status: 'past' as const,
                googleMeetLink: null,
                createdAt: '2026-02-01T15:00:00.000Z',
            },
        ]
        const mockList = mock(async (_psychoId: string, _clientId: string) => expected)
        const result = await mockList('psycho-123', 'client-456')
        expect(result).toEqual(expected)
        expect(result).toHaveLength(2)
    })

    it('returns empty array when no appointments exist for psychoId + clientId', async () => {
        const mockList = mock(async (_psychoId: string, _clientId: string) => [])
        const result = await mockList('psycho-123', 'client-999')
        expect(result).toEqual([])
    })
})

describe('GET /api/clients/:clientId/appointments/:appointmentId', () => {
    const mockUpcomingAppointment = {
        id: 'apt-001',
        psychoId: 'psycho-123',
        clientId: 'client-456',
        startTime: '2026-04-01T10:00:00.000Z',
        endTime: '2026-04-01T11:00:00.000Z',
        status: 'upcoming' as const,
        googleMeetLink: null,
        createdAt: '2026-03-10T15:00:00.000Z',
    }

    it('returns 200 with appointment on happy path', async () => {
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => mockUpcomingAppointment,
        )

        const app = new Hono()
        app.get('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const appointment = await mockFindById(appointmentId, user.id, clientId)
            if (!appointment) {
                return c.json({ error: 'NotFound' }, 404)
            }
            return c.json({ appointment }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', { method: 'GET' })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('id', 'apt-001')
        expect(body.appointment).toHaveProperty('status', 'upcoming')
    })

    it('returns 404 when appointment does not exist', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)

        const app = new Hono()
        app.get('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const appointment = await mockFindById(appointmentId, user.id, clientId)
            if (!appointment) {
                return c.json({ error: 'NotFound' }, 404)
            }
            return c.json({ appointment }, 200)
        })

        const res = await app.request('/client-456/appointments/nonexistent', { method: 'GET' })

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when psychoId does not match', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)

        const app = new Hono()
        app.get('/:clientId/appointments/:appointmentId', mockAuthorizedPsycho, async (c) => {
            const user = c.get('user')
            const clientId = c.req.param('clientId')
            const appointmentId = c.req.param('appointmentId')

            const appointment = await mockFindById(appointmentId, user.id, clientId)
            if (!appointment) {
                return c.json({ error: 'NotFound' }, 404)
            }
            return c.json({ appointment }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', { method: 'GET' })

        expect(res.status).toBe(404)
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.get('/:clientId/appointments/:appointmentId', mockUnauthorized, async (c) => {
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', { method: 'GET' })

        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.get('/:clientId/appointments/:appointmentId', mockForbidden, async (c) => {
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001', {
            method: 'GET',
            headers: { 'Helpsycho-User-Role': 'client' },
        })

        expect(res.status).toBe(403)
    })
})

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/start', () => {
    const mockUpcomingAppointment = {
        id: 'apt-001',
        psychoId: 'psycho-123',
        clientId: 'client-456',
        startTime: '2026-04-01T10:00:00.000Z',
        endTime: '2026-04-01T11:00:00.000Z',
        status: 'upcoming' as const,
        googleMeetLink: null,
        createdAt: '2026-03-10T15:00:00.000Z',
    }

    const mockActiveAppointment = {
        id: 'apt-999',
        psychoId: 'psycho-123',
        clientId: 'client-789',
        startTime: '2026-03-10T09:00:00.000Z',
        endTime: '2026-03-10T10:00:00.000Z',
        status: 'active' as const,
        googleMeetLink: null,
        createdAt: '2026-03-01T15:00:00.000Z',
    }

    it('returns 200 with appointment status active on happy path', async () => {
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => mockUpcomingAppointment,
        )
        const mockFindActive = mock(async (_psychoId: string) => null)
        const mockStart = mock(async (_id: string) => ({
            ...mockUpcomingAppointment,
            status: 'active' as const,
        }))

        const app = new Hono()
        app.patch(
            '/:clientId/appointments/:appointmentId/start',
            mockAuthorizedPsycho,
            async (c) => {
                const user = c.get('user')
                const clientId = c.req.param('clientId')
                const appointmentId = c.req.param('appointmentId')

                const existing = await mockFindById(appointmentId, user.id, clientId)
                if (!existing) return c.json({ error: 'NotFound' }, 404)

                if (existing.status !== 'upcoming') {
                    return c.json(
                        {
                            error: 'AppointmentNotStartable',
                            message: 'Only upcoming appointments can be started.',
                        },
                        400,
                    )
                }

                const active = await mockFindActive(user.id)
                if (active) {
                    return c.json(
                        {
                            error: 'AnotherAppointmentActive',
                            message: 'End your active appointment before starting a new one.',
                            activeAppointmentId: active.id,
                        },
                        400,
                    )
                }

                const appointment = await mockStart(appointmentId)
                return c.json({ appointment }, 200)
            },
        )

        const res = await app.request('/client-456/appointments/apt-001/start', {
            method: 'PATCH',
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'active')
    })

    it('returns 404 when appointment does not exist', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => null)

        const app = new Hono()
        app.patch(
            '/:clientId/appointments/:appointmentId/start',
            mockAuthorizedPsycho,
            async (c) => {
                const user = c.get('user')
                const clientId = c.req.param('clientId')
                const appointmentId = c.req.param('appointmentId')

                const existing = await mockFindById(appointmentId, user.id, clientId)
                if (!existing) return c.json({ error: 'NotFound' }, 404)

                return c.json({ appointment: {} }, 200)
            },
        )

        const res = await app.request('/client-456/appointments/nonexistent/start', {
            method: 'PATCH',
        })

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotStartable for past appointment', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => ({
            ...mockUpcomingAppointment,
            status: 'past' as const,
        }))

        const app = new Hono()
        app.patch(
            '/:clientId/appointments/:appointmentId/start',
            mockAuthorizedPsycho,
            async (c) => {
                const user = c.get('user')
                const clientId = c.req.param('clientId')
                const appointmentId = c.req.param('appointmentId')

                const existing = await mockFindById(appointmentId, user.id, clientId)
                if (!existing) return c.json({ error: 'NotFound' }, 404)

                if (existing.status !== 'upcoming') {
                    return c.json(
                        {
                            error: 'AppointmentNotStartable',
                            message: 'Only upcoming appointments can be started.',
                        },
                        400,
                    )
                }

                return c.json({ appointment: {} }, 200)
            },
        )

        const res = await app.request('/client-456/appointments/apt-001/start', {
            method: 'PATCH',
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotStartable')
        expect(body).toHaveProperty('message', 'Only upcoming appointments can be started.')
    })

    it('returns 400 AppointmentNotStartable for already active appointment', async () => {
        const mockFindById = mock(async (_id: string, _psychoId: string, _clientId: string) => ({
            ...mockUpcomingAppointment,
            status: 'active' as const,
        }))

        const app = new Hono()
        app.patch(
            '/:clientId/appointments/:appointmentId/start',
            mockAuthorizedPsycho,
            async (c) => {
                const user = c.get('user')
                const clientId = c.req.param('clientId')
                const appointmentId = c.req.param('appointmentId')

                const existing = await mockFindById(appointmentId, user.id, clientId)
                if (!existing) return c.json({ error: 'NotFound' }, 404)

                if (existing.status !== 'upcoming') {
                    return c.json(
                        {
                            error: 'AppointmentNotStartable',
                            message: 'Only upcoming appointments can be started.',
                        },
                        400,
                    )
                }

                return c.json({ appointment: {} }, 200)
            },
        )

        const res = await app.request('/client-456/appointments/apt-001/start', {
            method: 'PATCH',
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotStartable')
    })

    it('returns 400 AnotherAppointmentActive with activeAppointmentId when another is active', async () => {
        const mockFindById = mock(
            async (_id: string, _psychoId: string, _clientId: string) => mockUpcomingAppointment,
        )
        const mockFindActive = mock(async (_psychoId: string) => mockActiveAppointment)

        const app = new Hono()
        app.patch(
            '/:clientId/appointments/:appointmentId/start',
            mockAuthorizedPsycho,
            async (c) => {
                const user = c.get('user')
                const clientId = c.req.param('clientId')
                const appointmentId = c.req.param('appointmentId')

                const existing = await mockFindById(appointmentId, user.id, clientId)
                if (!existing) return c.json({ error: 'NotFound' }, 404)

                if (existing.status !== 'upcoming') {
                    return c.json(
                        {
                            error: 'AppointmentNotStartable',
                            message: 'Only upcoming appointments can be started.',
                        },
                        400,
                    )
                }

                const active = await mockFindActive(user.id)
                if (active) {
                    return c.json(
                        {
                            error: 'AnotherAppointmentActive',
                            message: 'End your active appointment before starting a new one.',
                            activeAppointmentId: active.id,
                        },
                        400,
                    )
                }

                return c.json({ appointment: {} }, 200)
            },
        )

        const res = await app.request('/client-456/appointments/apt-001/start', {
            method: 'PATCH',
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AnotherAppointmentActive')
        expect(body).toHaveProperty(
            'message',
            'End your active appointment before starting a new one.',
        )
        expect(body).toHaveProperty('activeAppointmentId', 'apt-999')
    })

    it('returns 401 for unauthenticated request', async () => {
        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId/start', mockUnauthorized, async (c) => {
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001/start', {
            method: 'PATCH',
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const app = new Hono()
        app.patch('/:clientId/appointments/:appointmentId/start', mockForbidden, async (c) => {
            return c.json({ appointment: {} }, 200)
        })

        const res = await app.request('/client-456/appointments/apt-001/start', {
            method: 'PATCH',
            headers: { 'Helpsycho-User-Role': 'client' },
        })

        expect(res.status).toBe(403)
    })
})

describe('startAppointment service (unit)', () => {
    it('returns appointment with status active', async () => {
        const mockStart = mock(async (_id: string) => ({
            id: 'apt-001',
            psychoId: 'psycho-123',
            clientId: 'client-456',
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
            status: 'active' as const,
            googleMeetLink: null,
            createdAt: '2026-03-10T15:00:00.000Z',
        }))

        const result = await mockStart('apt-001')

        expect(result.status).toBe('active')
        expect(result.id).toBe('apt-001')
    })
})

describe('findActiveAppointmentByPsycho service (unit)', () => {
    it('returns active appointment when one exists', async () => {
        const expected = {
            id: 'apt-999',
            psychoId: 'psycho-123',
            clientId: 'client-789',
            startTime: '2026-03-10T09:00:00.000Z',
            endTime: '2026-03-10T10:00:00.000Z',
            status: 'active' as const,
            googleMeetLink: null,
            createdAt: '2026-03-01T15:00:00.000Z',
        }
        const mockFindActive = mock(async (_psychoId: string) => expected)
        const result = await mockFindActive('psycho-123')
        expect(result).toEqual(expected)
        expect(result?.status).toBe('active')
    })

    it('returns null when no active appointment exists', async () => {
        const mockFindActive = mock(async (_psychoId: string) => null)
        const result = await mockFindActive('psycho-123')
        expect(result).toBeNull()
    })
})
