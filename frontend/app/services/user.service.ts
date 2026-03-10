import { api } from './api'

export interface UserApiResponse {
    id: string
    email: string
    name: string
    active_role: 'psycho' | 'client' | null
}

export const userService = {
    getMe: () => api.get<UserApiResponse>('/users/me'),
    setActiveRole: (role: 'psycho' | 'client') =>
        api.patch<UserApiResponse>('/users/me/role', { role }),
}
