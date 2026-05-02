import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { clientIdAppointmentIdParamSchema } from 'utils/types'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import { createAttachmentPsychoSchema, listQuerySchemaPsycho } from './schemas'
import { AttachmentsService } from './services'

export const attachmentPsychoRoutes = new Hono().use(authorized, onlyPsychoRequest)

attachmentPsychoRoutes.get(
    '/',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('query', listQuerySchemaPsycho),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const { type } = c.req.valid('query')
        const result = await AttachmentsService.listForPsycho(
            appointmentId,
            user.id,
            clientId,
            type ? [type] : undefined,
        )
        return c.json(result, 200)
    },
)

attachmentPsychoRoutes.post(
    '/',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('json', createAttachmentPsychoSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const { type, name, text, imageFileIds, audioFileIds } = c.req.valid('json')
        const attachment = await AttachmentsService.createForPsycho({
            psychoId: user.id,
            clientId,
            appointmentId,
            type,
            name,
            text,
            imageFileIds,
            audioFileIds,
        })
        return c.json({ attachment }, 201)
    },
)

attachmentPsychoRoutes.get(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const result = await AttachmentsService.getForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId: c.req.param('attachmentId'),
        })
        return c.json(result, 200)
    },
)

attachmentPsychoRoutes.delete(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        await AttachmentsService.deleteForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId: c.req.param('attachmentId'),
        })
        return c.body(null, 204)
    },
)
