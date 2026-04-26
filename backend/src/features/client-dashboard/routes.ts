import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import {
    findActiveAppointmentForClient,
    findNextUpcomingAppointmentForClient,
    countAppointmentsForClient,
} from '../appointments/services'
import { listPendingRecommendationsForClient } from '../attachments/services'
import { findPsychologistsForClient } from '../clients/services'

export const clientDashboardRoutes = new Hono()

clientDashboardRoutes.use(authorized, onlyClientRequest)

clientDashboardRoutes.get('/', async (c) => {
    const user = c.get('user')

    const [
        psychologists,
        activeAppointment,
        nextAppointment,
        pendingRecommendations,
        appointmentCounts,
    ] = await Promise.all([
        findPsychologistsForClient(user.id),
        findActiveAppointmentForClient(user.id),
        findNextUpcomingAppointmentForClient(user.id),
        listPendingRecommendationsForClient(user.id),
        countAppointmentsForClient(user.id),
    ])

    return c.json(
        {
            psychologists,
            activeAppointment,
            nextAppointment,
            pendingRecommendations,
            appointmentCounts,
        },
        200,
    )
})
