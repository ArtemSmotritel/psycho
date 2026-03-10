import { type RouteConfig, index, route, layout, prefix } from '@react-router/dev/routes'

export default [
    index('routes/home.tsx'),
    route('login', 'routes/login.tsx'),
    route('auth/callback', 'routes/auth-callback.tsx'),
    route('role-select', 'routes/role-select.tsx'),
    ...prefix(':role', [
        layout('routes/psychologist/layout.tsx', [
            index('routes/psychologist/dashboard.index.tsx'),
            ...prefix('clients', [
                index('routes/psychologist/clients.tsx'),
                ...prefix(':clientId', [
                    layout('routes/psychologist/client-layout.tsx', [
                        index('routes/psychologist/client-profile.tsx'),
                        route('progress', 'routes/psychologist/client-progress.tsx'),
                        ...prefix('appointments', [
                            index('routes/psychologist/client-sessions.tsx'),
                            ...prefix(':appointmentId', [
                                index('routes/psychologist/session.tsx'),
                                ...prefix('attachment', [
                                    route(
                                        ':attachmentId',
                                        'routes/psychologist/session-attachment.tsx',
                                    ),
                                ]),
                                route('live', 'routes/psychologist/live-session.tsx'),
                            ]),
                        ]),
                    ]),
                ]),
            ]),
            route('associative-images', 'routes/psychologist/associative-images.tsx'),
            ...prefix('appointments', [index('routes/psychologist/sessions.tsx')]),
        ]),
    ]),
    layout('routes/client/layout.tsx', [
        route('client', 'routes/client/dashboard.tsx'),
        route('client/no-psychologist', 'routes/client/no-psychologist.tsx'),
    ]),
] satisfies RouteConfig
