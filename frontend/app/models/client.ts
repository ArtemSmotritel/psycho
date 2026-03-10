export interface Client {
    id: string
    name: string
    email: string
    image?: string | null
    // Future fields (populated by later tickets):
    lastSession?: string | null
    nextSession?: string | null
    sessionsCount?: number
}
