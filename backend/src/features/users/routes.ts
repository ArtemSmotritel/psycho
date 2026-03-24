import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized } from '../../middlewares/auth'
import { findUserById, setActiveRole } from './service'

const setRoleSchema = z.object({
    role: z.enum(['psycho', 'client']),
})

export const userRoutes = new Hono()

userRoutes.get('/me', authorized, async (c) => {
    const user = c.get('user')
    const fullUser = await findUserById(user.id)

    return c.json({
        id: (fullUser as any).id,
        email: (fullUser as any).email,
        name: (fullUser as any).name,
        active_role: (fullUser as any).active_role ?? null,
    })
})

userRoutes.patch('/me/role', authorized, zValidator('json', setRoleSchema), async (c) => {
    const user = c.get('user')
    const { role } = c.req.valid('json')

    const updated = await setActiveRole(user.id, role)

    return c.json({
        id: (updated as any).id,
        email: (updated as any).email,
        name: (updated as any).name,
        active_role: (updated as any).active_role,
    })
})
