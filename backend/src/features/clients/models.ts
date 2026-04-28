export interface Client {
    id: string // = user_id
    email: string
    name: string
    image: string | null
    username: string | null
    phone: string | null
    telegram: string | null
    instagram: string | null
    registrationDate: string // ISO, from user.created_at
    sessionsCount: number
    impressionsCount: number
    recommendationsCount: number
    lastAppointment: { id: string; startTime: string; endTime: string } | null
    nextAppointment: { id: string; startTime: string } | null
}

export type ClientSummary = Pick<Client, 'id' | 'name' | 'email' | 'image'>

export type PsychologistSummary = Pick<Client, 'id' | 'name' | 'email' | 'image'>

export type ClientProfileUpdate = Partial<
    Pick<Client, 'name' | 'username' | 'phone' | 'telegram' | 'instagram'>
>

export type ClientContactFieldsUpdate = Omit<ClientProfileUpdate, 'name'>

export interface PsychologistClientLink {
    clientId: string
    psychoId: string
    disconnectedAt: string | null
}
