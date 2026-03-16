import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import {
    findNextUpcomingAppointmentForClient,
    countAppointmentsForClient,
} from '../appointments/services'
import { listPendingRecommendationsForClient } from '../attachments/services'

export const clientDashboardRoutes = new Hono()

clientDashboardRoutes.use(authorized, onlyClientRequest)

clientDashboardRoutes.get('/', async (c) => {
    const user = c.get('user')

    const [nextAppointment, pendingRecommendations, appointmentCounts] = await Promise.all([
        findNextUpcomingAppointmentForClient(user.id),
        listPendingRecommendationsForClient(user.id),
        countAppointmentsForClient(user.id),
    ])

    return c.json(
        {
            nextAppointment,
            pendingRecommendations,
            appointmentCounts,
        },
        200,
    )
})
