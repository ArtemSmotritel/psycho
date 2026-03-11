import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import {
    createAppointment,
    deleteAppointment,
    endAppointment,
    findActiveAppointmentByPsycho,
    findAppointmentById,
    isClientLinkedAndActive,
    listAppointments,
    startAppointment,
    updateAppointment,
} from './services'

export const appointmentRoutes = new Hono()

appointmentRoutes.use(authorized, onlyPsychoRequest).get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')

    const linked = await isClientLinkedAndActive(clientId, user.id)
    if (!linked) {
        return c.json(
            { error: 'ClientNotLinked', message: 'This client is not in your list.' },
            400,
        )
    }

    const appointments = await listAppointments(user.id, clientId)
    return c.json({ appointments }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).get('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ appointment }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).patch('/:appointmentId/start', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
    if (!existing) {
        return c.json({ error: 'NotFound' }, 404)
    }

    if (existing.status !== 'upcoming') {
        return c.json(
            {
                error: 'AppointmentNotStartable',
                message: 'Only upcoming appointments can be started.',
            },
            400,
        )
    }

    const active = await findActiveAppointmentByPsycho(user.id)
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

    const appointment = await startAppointment(appointmentId)
    return c.json({ appointment }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).patch('/:appointmentId/end', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
    if (!existing) {
        return c.json({ error: 'NotFound' }, 404)
    }

    if (existing.status !== 'active') {
        return c.json(
            {
                error: 'AppointmentNotEndable',
                message: 'Only active appointments can be ended.',
            },
            400,
        )
    }

    // TODO: EDG-47 — save whiteboard snapshot before ending
    const appointment = await endAppointment(appointmentId)
    return c.json({ appointment }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).post('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const body = await c.req.json()

    const { startTime, endTime } = body

    if (!startTime) {
        return c.json({ error: 'BadRequest', message: 'startTime is required' }, 400)
    }
    if (!endTime) {
        return c.json({ error: 'BadRequest', message: 'endTime is required' }, 400)
    }
    if (new Date(endTime) <= new Date(startTime)) {
        return c.json({ error: 'BadRequest', message: 'endTime must be after startTime' }, 400)
    }

    const linked = await isClientLinkedAndActive(clientId, user.id)
    if (!linked) {
        return c.json(
            { error: 'ClientNotLinked', message: 'This client is not in your list.' },
            400,
        )
    }

    const appointment = await createAppointment({
        psychoId: user.id,
        clientId,
        startTime,
        endTime,
        googleMeetLink: null,
    })

    return c.json({ appointment }, 201)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).patch('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const body = await c.req.json()

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
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
    const mergedLink = 'googleMeetLink' in body ? body.googleMeetLink : existing.googleMeetLink

    if (new Date(mergedEnd) <= new Date(mergedStart)) {
        return c.json({ error: 'BadRequest', message: 'endTime must be after startTime' }, 400)
    }

    const appointment = await updateAppointment(appointmentId, {
        startTime: mergedStart,
        endTime: mergedEnd,
        googleMeetLink: mergedLink,
    })

    // TODO: EDG-58 — send rescheduled email to client if startTime or endTime changed

    return c.json({ appointment }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).delete('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
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

    await deleteAppointment(appointmentId)

    // TODO: EDG-57 — send appointment deleted email to client

    return c.json({ success: true }, 200)
})
