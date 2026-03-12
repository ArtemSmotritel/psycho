import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { auth } from 'utils/auth'
import { log } from 'utils/logger'
import { setSession, setUserRole } from '../middlewares/auth'
import { clientRoutes } from '../features/clients/routes'
import { userRoutes } from '../features/users/routes'
import { appointmentRoutes } from '../features/appointments/routes'
import { clientAppointmentRoutes } from '../features/appointments/client-routes'
import { psychoAppointmentRoutes } from '../features/appointments/psycho-routes'
import { whiteboardRoutes } from '../features/whiteboard/routes'

export const app = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null
        session: typeof auth.$Infer.Session.session | null
    }
}>()

app.use(
    cors({
        origin: process.env.FRONTEND_URL as string,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowHeaders: ['Content-Type', 'Authorization', 'Helpsycho-User-Role'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
    }),
)

app.use(logger())

app.onError((err, c) => {
    log.error(`[Error] ${c.req.method} ${c.req.url}:`, err)

    if (err instanceof HTTPException) {
        return err.getResponse()
    }

    if (err.name === 'ZodError') {
        return c.json(
            {
                success: false,
                message: 'Validation Failed',
                errors: err,
            },
            400,
        )
    }

    return c.json(
        {
            success: false,
            message: err.message || 'Internal Server Error',
            // Hide stack traces in production
            stack: process.env.ENV === 'production' ? undefined : err.stack,
        },
        500,
    )
})

app.notFound((c) => {
    return c.json({ message: 'Route not found', success: false }, 404)
})

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.use('*', setSession)

app.use(setUserRole)

app.route('/api/clients', clientRoutes)
app.route('/api/users', userRoutes)
app.route('/api/clients/:clientId/appointments', appointmentRoutes)
app.route('/api/appointments', clientAppointmentRoutes)
app.route('/api/psycho/appointments', psychoAppointmentRoutes)
app.route('/api/whiteboard', whiteboardRoutes)
