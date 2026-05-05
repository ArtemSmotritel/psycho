export const psychoAppt = (clientId: string, appointmentId?: string) =>
    `/clients/${clientId}/appointments${appointmentId ? `/${appointmentId}` : ''}`

export const clientAppt = (appointmentId?: string) =>
    `/client/appointments${appointmentId ? `/${appointmentId}` : ''}`

export const psychoAtt = (clientId: string, appointmentId: string, attachmentId?: string) =>
    `${psychoAppt(clientId, appointmentId)}/attachments${attachmentId ? `/${attachmentId}` : ''}`

export const clientAtt = (appointmentId: string, attachmentId?: string) =>
    `${clientAppt(appointmentId)}/attachments${attachmentId ? `/${attachmentId}` : ''}`
