import axios from 'axios'

export const API_ORIGIN = import.meta.env.VITE_API_URL

export const api = axios.create({
    baseURL: `${API_ORIGIN}/api`,
    withCredentials: true,
})

export function setApiRole(role: 'psycho' | 'client' | null) {
    if (role) {
        api.defaults.headers.common['Helpsycho-User-Role'] = role
    } else {
        delete api.defaults.headers.common['Helpsycho-User-Role']
    }
}

export const apiEvents = new EventTarget()
export const API_UNAUTHORIZED_EVENT = 'unauthorized'
export const API_ROLE_MISMATCH_EVENT = 'role-mismatch'

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status
        if (status === 401) {
            apiEvents.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT))
        } else if (status === 403 && err?.response?.data?.error === 'RoleMismatch') {
            apiEvents.dispatchEvent(new Event(API_ROLE_MISMATCH_EVENT))
        }
        return Promise.reject(err)
    },
)
