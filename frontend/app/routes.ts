import { type RouteConfig, index, route, layout } from '@react-router/dev/routes'

export default [
    index('routes/home.tsx'),
    route('login', 'routes/login.tsx'),
    route('auth/callback', 'routes/auth-callback.tsx'),
    route('role-select', 'routes/role-select.tsx'),
    layout('routes/psychologist/layout.tsx', [
        route('psycho', 'routes/psychologist/dashboard.index.tsx'),
        route('psycho/clients', 'routes/psychologist/clients.tsx'),
        route('psycho/clients/:clientId', 'routes/psychologist/client-layout.tsx', [
            index('routes/psychologist/client-profile.tsx'),
            route('progress', 'routes/psychologist/client-progress.tsx'),
            route('appointments', 'routes/psychologist/client-sessions.tsx'),
            route('appointments/:appointmentId', 'routes/psychologist/session.tsx'),
            route(
                'appointments/:appointmentId/attachment/:attachmentId',
                'routes/psychologist/session-attachment.tsx',
            ),
            route('appointments/:appointmentId/live', 'routes/psychologist/live-session.tsx'),
        ]),
        route('psycho/associative-images', 'routes/psychologist/associative-images.tsx'),
        route('psycho/appointments', 'routes/psychologist/sessions.tsx'),
    ]),
    layout('routes/client/layout.tsx', [
        route('client', 'routes/client/dashboard.tsx'),
        route('client/no-psychologist', 'routes/client/no-psychologist.tsx'),
        route('client/appointments', 'routes/client/appointments.tsx'),
        route('client/appointments/:appointmentId', 'routes/client/appointment-detail.tsx'),
        route('client/appointments/:appointmentId/live', 'routes/client/live-appointment.tsx'),
    ]),
] satisfies RouteConfig
