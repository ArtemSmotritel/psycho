export type UserRole = 'psychologist' | 'client' | 'roleless'

export interface User {
    id: string
    email: string
    role?: UserRole
    name: string
    image: string | null
    lastLogin?: Date
    activeRole: 'psycho' | 'client' | null
}
