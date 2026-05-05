import axios from 'axios'

export const API_ORIGIN = import.meta.env.VITE_API_URL

export const api = axios.create({
    baseURL: `${API_ORIGIN}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
})

export function setApiRole(role: 'psycho' | 'client' | null) {
    if (role) {
        api.defaults.headers.common['Helpsycho-User-Role'] = role
    } else {
        delete api.defaults.headers.common['Helpsycho-User-Role']
    }
}
