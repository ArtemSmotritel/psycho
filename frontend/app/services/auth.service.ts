import { createAuthClient } from 'better-auth/react'
import { API_ORIGIN } from './api'

export const auth = createAuthClient({
    baseURL: API_ORIGIN,
    basePath: '/api/auth',
})
