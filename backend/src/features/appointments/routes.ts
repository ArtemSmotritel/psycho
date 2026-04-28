import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AppointmentsService } from './services'

const createAppointmentSchema = z.object({
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
    generateGoogleMeet: z.boolean().optional(),
    fromRequestId: z.string().optional(),
    acknowledgePingConflict: z.boolean().optional(),
})

const updateAppointmentSchema = z.object({
    startTime: z.iso.datetime({ offset: true }).optional(),
    endTime: z.iso.datetime({ offset: true }).optional(),
    googleMeetLink: z.url().nullable().optional(),
    rescheduleGoogleMeet: z.boolean().optional(),
    acknowledgePingConflict: z.boolean().optional(),
})

const endAppointmentSchema = z.object({
    snapshotDataUrl: z
        .string()
        .max(2_800_000, {
            message: 'snapshotDataUrl exceeds the 2 MB limit',
        })
        .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, {
            message: 'snapshotDataUrl must be a PNG, JPEG, or WebP base64 data URL',
        })
        .optional(),
})

export const appointmentRoutes = new Hono().use(authorized, onlyPsychoRequest)

appointmentRoutes.get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointments = await AppointmentsService.listForPsycho(user.id, clientId)
    return c.json({ appointments }, 200)
})

appointmentRoutes.post('/', zValidator('json', createAppointmentSchema), async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const { startTime, endTime, generateGoogleMeet } = c.req.valid('json')
    const result = await AppointmentsService.createForPsycho({
        psychoId: user.id,
        clientId,
        startTime,
        endTime,
        generateGoogleMeet,
    })
    return c.json(result, 201)
})

appointmentRoutes.get('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const appointment = await AppointmentsService.getForPsycho(appointmentId, user.id, clientId)
    return c.json({ appointment }, 200)
})

appointmentRoutes.patch(
    '/:appointmentId',
    zValidator('json', updateAppointmentSchema),
    async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const appointmentId = c.req.param('appointmentId')
        const body = c.req.valid('json')
        const result = await AppointmentsService.updateForPsycho(
            appointmentId,
            user.id,
            clientId,
            body,
        )
        return c.json(result, 200)
    },
)

appointmentRoutes.delete('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const result = await AppointmentsService.deleteForPsycho(appointmentId, user.id, clientId)
    return c.json(result, 200)
})

appointmentRoutes.patch('/:appointmentId/start', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const appointment = await AppointmentsService.startForPsycho(appointmentId, user.id, clientId)
    return c.json({ appointment }, 200)
})

appointmentRoutes.patch(
    '/:appointmentId/end',
    zValidator('json', endAppointmentSchema),
    async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const appointmentId = c.req.param('appointmentId')
        const { snapshotDataUrl } = c.req.valid('json')
        const appointment = await AppointmentsService.endForPsycho(
            appointmentId,
            user.id,
            clientId,
            snapshotDataUrl ?? null,
        )
        return c.json({ appointment }, 200)
    },
)
