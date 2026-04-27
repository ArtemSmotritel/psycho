import type { Context } from 'hono'
import { findAppointmentById } from '../appointments/services'
import type { Appointment } from '../appointments/models'

type AppointmentCheck = { ok: true; appointment: Appointment } | { ok: false; response: Response }

export async function checkAppointmentOwnership(c: Context): Promise<AppointmentCheck> {
    const user = c.get('user')!
    const clientId = c.req.param('clientId')!
    const appointmentId = c.req.param('appointmentId')!

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return { ok: false, response: c.json({ error: 'NotFound' }, 404) }
    }

    return { ok: true, appointment }
}

/**
 * Steps 1–2: appointment ownership + status check.
 * Returns 404 if not found / ownership fails.
 * Returns 400 AppointmentNotActive if upcoming.
 */
export async function checkAppointmentAccess(c: Context): Promise<AppointmentCheck> {
    const ownership = await checkAppointmentOwnership(c)
    if (!ownership.ok) return ownership

    const { appointment } = ownership
    if (appointment.status === 'upcoming') {
        return {
            ok: false,
            response: c.json(
                { error: 'AppointmentNotActive', message: 'Appointment is not active or past.' },
                400,
            ),
        }
    }

    return { ok: true, appointment }
}

export const notFoundResponse = (c: Context) => c.json({ error: 'NotFound' }, 404)
