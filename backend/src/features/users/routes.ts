import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized } from '../../middlewares/auth'
import type { User } from './models'
import { UsersService } from './services'

const setRoleSchema = z.object({
    role: z.enum(['psycho', 'client']),
})

const toApiShape = (user: User) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    active_role: user.activeRole,
})

export const userRoutes = new Hono().use(authorized)

userRoutes.get('/me', async (c) => {
    const user = c.get('user')
    const me = await UsersService.getById(user.id)
    return c.json(toApiShape(me), 200)
})

userRoutes.patch('/me/role', zValidator('json', setRoleSchema), async (c) => {
    const user = c.get('user')
    const { role } = c.req.valid('json')
    const updated = await UsersService.setActiveRole(user.id, role)
    return c.json(toApiShape(updated), 200)
})
