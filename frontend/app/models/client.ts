export interface Client {
    id: string
    name: string
    email: string
    image: string | null
    createdAt?: string
    // Future fields (populated by EDG-17/EDG-20):
    upcomingAppointment?: string | null
    lastAppointment?: string | null
    appointmentsCount?: number
}
