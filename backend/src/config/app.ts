import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { AppError } from 'errors/index'
import { auth } from 'utils/auth'
import { log } from 'utils/logger'
import { setSession, setUserRole } from '../middlewares/auth'
import { clientRoutes, clientSelfRoutes } from '../features/clients/routes'
import { userRoutes } from '../features/users/routes'
import { appointmentRoutes } from '../features/appointments/routes'
import { clientAppointmentRoutes } from '../features/appointments/client-routes'
import { psychoAppointmentRoutes } from '../features/appointments/psycho-routes'
import { whiteboardRoutes } from '../features/whiteboard/routes'
import { fileRoutes } from '../features/files/routes'
import { noteRoutes } from '../features/attachments/notes-routes'
import { impressionClientRoutes } from '../features/attachments/impressions-client-routes'
import { recommendationPsychoRoutes } from '../features/attachments/recommendations-psycho-routes'
import { recommendationClientRoutes } from '../features/attachments/recommendations-client-routes'
import { progressPsychoRoutes } from '../features/attachments/progress-psycho-routes'
import { progressClientRoutes } from '../features/attachments/progress-client-routes'
import { attachmentPsychoRoutes } from '../features/attachments/attachment-psycho-routes'
import { attachmentClientRoutes } from '../features/attachments/attachment-client-routes'
import { clientDashboardRoutes, psychoDashboardRoutes } from '../features/dashboard/routes'
import { invitationRoutes } from '../features/invitations/routes'
import { associativeImageRoutes } from '../features/associative-images/routes'

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

    if (err instanceof AppError) {
        return c.json({ error: err.code, message: err.message, ...(err.details ?? {}) }, err.status)
    }

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
app.use('*', setUserRole)

app.route('/api/clients', clientSelfRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/users', userRoutes)
app.route('/api/clients/:clientId/appointments', appointmentRoutes)
app.route('/api/client/appointments', clientAppointmentRoutes)
app.route('/api/psycho/appointments', psychoAppointmentRoutes)
app.route('/api/clients/:clientId/appointments/:appointmentId/notes', noteRoutes)
app.route('/api/client/appointments/:appointmentId/impressions', impressionClientRoutes)
app.route(
    '/api/clients/:clientId/appointments/:appointmentId/recommendations',
    recommendationPsychoRoutes,
)
app.route('/api/client/appointments/:appointmentId/recommendations', recommendationClientRoutes)
app.route('/api/clients/:clientId/progress/impressions', progressPsychoRoutes)
app.route('/api/client/progress', progressClientRoutes)
app.route('/api/clients/:clientId/appointments/:appointmentId/attachments', attachmentPsychoRoutes)
app.route('/api/client/appointments/:appointmentId/attachments', attachmentClientRoutes)

app.route('/api/client/dashboard', clientDashboardRoutes)
app.route('/api/psycho/dashboard', psychoDashboardRoutes)

app.route('/api/files', fileRoutes)
app.route('/api/whiteboard', whiteboardRoutes)
app.route('/api/invitations', invitationRoutes)
app.route('/api/associative-images', associativeImageRoutes)
