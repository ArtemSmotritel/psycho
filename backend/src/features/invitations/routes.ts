import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import {
    acceptInvitationByToken,
    buildInviteLink,
    createInvitation,
    deleteInvitation,
    InvitationError,
    listPendingInvitationsByPsychologist,
} from './services'

const createInvitationSchema = z.object({
    email: z.email(),
})

const acceptInvitationSchema = z.object({
    token: z.string().min(1),
})

export const invitationRoutes = new Hono()

invitationRoutes
    .get('/', authorized, onlyPsychoRequest, async (c) => {
        const user = c.get('user')
        const invitations = await listPendingInvitationsByPsychologist(user.id)
        return c.json({ invitations }, 200)
    })
    .post(
        '/',
        authorized,
        onlyPsychoRequest,
        zValidator('json', createInvitationSchema),
        async (c) => {
            const user = c.get('user')
            const { email } = c.req.valid('json')

            try {
                const invitation = await createInvitation(user.id, email)
                return c.json(
                    {
                        ...invitation,
                        inviteLink: buildInviteLink(invitation.token),
                    },
                    201,
                )
            } catch (err) {
                if (err instanceof InvitationError) {
                    return c.json({ error: err.code, message: err.message }, 400)
                }
                throw err
            }
        },
    )
    .delete('/:id', authorized, onlyPsychoRequest, async (c) => {
        const user = c.get('user')
        const id = c.req.param('id')

        try {
            await deleteInvitation(user.id, id)
            return c.body(null, 204)
        } catch (err) {
            if (err instanceof InvitationError) {
                if (err.code === 'NotFound') {
                    return c.json({ error: err.code, message: err.message }, 404)
                }
                return c.json({ error: err.code, message: err.message }, 400)
            }
            throw err
        }
    })
    .post('/accept', authorized, zValidator('json', acceptInvitationSchema), async (c) => {
        const user = c.get('user')
        const { token } = c.req.valid('json')

        try {
            const result = await acceptInvitationByToken(token, user.email, user.id)
            return c.json(result, 200)
        } catch (err) {
            if (err instanceof InvitationError) {
                if (err.code === 'NotFound') {
                    return c.json({ error: err.code, message: err.message }, 404)
                }
                return c.json({ error: err.code, message: err.message }, 400)
            }
            throw err
        }
    })
