import { z } from 'zod/v4'
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

export const clientIdParamSchema = z.object({ clientId: z.string() })
export const appointmentIdParamSchema = z.object({ appointmentId: z.uuid() })
export const clientIdAppointmentIdParamSchema = z.object({
    clientId: z.string(),
    appointmentId: z.uuid(),
})
