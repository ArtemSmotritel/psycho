export interface Client {
    id: string
    name: string
    email: string
    image: string | null
    username: string | null
    phone: string | null
    telegram: string | null
    instagram: string | null
    registrationDate: string
    sessionsCount: number
    impressionsCount: number
    recommendationsCount: number
    lastAppointment: { id: string; startTime: string; endTime: string } | null
    nextAppointment: { id: string; startTime: string } | null
}
