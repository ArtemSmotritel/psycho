import type { CLIENT_ROLE, NO_ROLE, PSYCHO_ROLE } from '../constants'
import type { auth } from './auth'

export type User = typeof auth.$Infer.Session.user
export type Session = typeof auth.$Infer.Session.session

declare module 'hono' {
    interface ContextVariableMap {
        user: User | null
        session: Session | null
        role: typeof CLIENT_ROLE | typeof PSYCHO_ROLE | typeof NO_ROLE
    }
}

export interface MiddlewareVariable<K extends string, V> {
    Variables: Record<K, V>
}
