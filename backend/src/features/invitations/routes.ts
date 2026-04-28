import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { InvitationsService } from './services'

const createInvitationSchema = z.object({
    email: z.email(),
})

const acceptInvitationSchema = z.object({
    token: z.string().min(1),
})

export const invitationRoutes = new Hono().use(authorized)

invitationRoutes.get('/', onlyPsychoRequest, async (c) => {
    const user = c.get('user')
    const invitations = await InvitationsService.listPendingForPsycho(user.id)
    return c.json({ invitations }, 200)
})

invitationRoutes.post(
    '/',
    onlyPsychoRequest,
    zValidator('json', createInvitationSchema),
    async (c) => {
        const user = c.get('user')
        const { email } = c.req.valid('json')
        const invitation = await InvitationsService.createForPsycho(user.id, email)
        return c.json(invitation, 201)
    },
)

invitationRoutes.delete('/:id', onlyPsychoRequest, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    await InvitationsService.deleteForPsycho(user.id, id)
    return c.body(null, 204)
})

invitationRoutes.post('/accept', zValidator('json', acceptInvitationSchema), async (c) => {
    const user = c.get('user')
    const { token } = c.req.valid('json')
    const result = await InvitationsService.acceptByToken(token, user.email, user.id)
    return c.json(result, 200)
})
