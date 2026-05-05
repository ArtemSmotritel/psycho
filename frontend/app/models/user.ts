export type UserRole = 'psycho' | 'client' | 'roleless'

export interface User {
    id: string
    email: string
    role?: UserRole
    name: string
    image: string | null
    lastLogin?: Date
    activeRole: 'psycho' | 'client' | null
}
