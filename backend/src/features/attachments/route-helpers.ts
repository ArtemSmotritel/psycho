import type { Context } from 'hono'
import { BadRequestError } from 'errors/index'
import { AppointmentsService } from '../appointments/services'
import type { Appointment } from '../appointments/models'

export async function checkAppointmentOwnership(c: Context): Promise<Appointment> {
    const user = c.get('user')!
    const clientId = c.req.param('clientId')!
    const appointmentId = c.req.param('appointmentId')!
    return AppointmentsService.getForPsycho(appointmentId, user.id, clientId)
}

export async function checkAppointmentAccess(c: Context): Promise<Appointment> {
    const appointment = await checkAppointmentOwnership(c)
    if (appointment.status === 'upcoming') {
        throw new BadRequestError('Appointment is not active or past.', 'AppointmentNotActive')
    }
    return appointment
}
