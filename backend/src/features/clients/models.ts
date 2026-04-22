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
