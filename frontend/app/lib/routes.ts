export const routes = {
    home: '/',
    login: '/login',
    authCallback: '/auth/callback',
    roleSelect: '/role-select',
    invite: '/invite',
    me: '/me',
    psycho: {
        root: '/psycho',
        clients: '/psycho/clients',
        client: (clientId: string) => `/psycho/clients/${clientId}`,
        clientProgress: (clientId: string) => `/psycho/clients/${clientId}/progress`,
        clientAppointments: (clientId: string) => `/psycho/clients/${clientId}/appointments`,
        appointment: (clientId: string, appointmentId: string) =>
            `/psycho/clients/${clientId}/appointments/${appointmentId}`,
        appointmentLive: (clientId: string, appointmentId: string) =>
            `/psycho/clients/${clientId}/appointments/${appointmentId}/live`,
        attachment: (clientId: string, appointmentId: string, attachmentId: string) =>
            `/psycho/clients/${clientId}/appointments/${appointmentId}/attachment/${attachmentId}`,
        invitations: '/psycho/invitations',
        associativeImages: '/psycho/associative-images',
        appointments: '/psycho/appointments',
    },
    client: {
        root: '/client',
        noPsychologist: '/client/no-psychologist',
        appointments: '/client/appointments',
        progress: '/client/progress',
        appointment: (appointmentId: string) => `/client/appointments/${appointmentId}`,
        appointmentLive: (appointmentId: string) => `/client/appointments/${appointmentId}/live`,
        attachment: (appointmentId: string, attachmentId: string) =>
            `/client/appointments/${appointmentId}/attachment/${attachmentId}`,
    },
} as const
