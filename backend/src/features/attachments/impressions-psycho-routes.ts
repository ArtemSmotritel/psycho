import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AppointmentsService } from '../appointments/services'
import { listAttachments, findAndValidateAttachment, findImpressionCompletion } from './services'

export const impressionPsychoRoutes = new Hono()

impressionPsychoRoutes.use(authorized, onlyPsychoRequest)

impressionPsychoRoutes.get('/:attachmentId/completion', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    await AppointmentsService.getForPsycho(appointmentId, user.id, clientId)

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'impression')
    if (!attachment) {
        throw new NotFoundError()
    }

    const completion = await findImpressionCompletion(attachmentId)
    return c.json({ completion }, 200)
})

impressionPsychoRoutes.get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    await AppointmentsService.getForPsycho(appointmentId, user.id, clientId)

    const impressions = await listAttachments(appointmentId, 'impression')
    return c.json({ impressions }, 200)
})
