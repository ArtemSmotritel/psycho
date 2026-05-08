import type { AxiosRequestConfig } from 'axios'
import { api } from './api'

export interface UserApiResponse {
    id: string
    email: string
    name: string
    active_role: 'psycho' | 'client' | null
}

export const userService = {
    getMe: (config?: AxiosRequestConfig) => api.get<UserApiResponse>('/users/me', config),
    setActiveRole: (role: 'psycho' | 'client') =>
        api.patch<UserApiResponse>('/users/me/role', { role }),
}
