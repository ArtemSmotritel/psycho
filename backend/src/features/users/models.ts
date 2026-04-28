export interface User {
    id: string
    email: string
    name: string
    activeRole: 'psycho' | 'client' | null
}
