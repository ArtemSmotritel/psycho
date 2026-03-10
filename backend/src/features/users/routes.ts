import { Hono } from 'hono'
import { authorized } from '../../middlewares/auth'
import { getMe, setActiveRole } from './service'

export const userRoutes = new Hono()

userRoutes.get('/me', authorized, async (c) => {
    const user = c.get('user')
    const fullUser = await getMe(user.id)

    return c.json({
        id: (fullUser as any).id,
        email: (fullUser as any).email,
        name: (fullUser as any).name,
        active_role: (fullUser as any).active_role ?? null,
    })
})

userRoutes.patch('/me/role', authorized, async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const { role } = body

    if (role !== 'psycho' && role !== 'client') {
        return c.json({ error: 'Invalid role' }, 400)
    }

    const updated = await setActiveRole(user.id, role)

    return c.json({
        id: (updated as any).id,
        email: (updated as any).email,
        name: (updated as any).name,
        active_role: (updated as any).active_role,
    })
})
